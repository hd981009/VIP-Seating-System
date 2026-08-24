// 全域狀態管理
let state = {
  guests: [],
  tables: [],
  showTitles: true,
  zoomScale: 1.0,
  editingGuestId: null
};

// 初始化預設 3 張桌子 (主桌1, 主桌2, 主桌3)
function initDefaultTables() {
  state.tables = [
    { id: 't-1', name: '主桌 1', capacity: 10, seats: Array(10).fill(null) },
    { id: 't-2', name: '主桌 2', capacity: 10, seats: Array(10).fill(null) },
    { id: 't-3', name: '主桌 3', capacity: 10, seats: Array(10).fill(null) }
  ];
}

// DOM 元件引用
const guestListEl = document.getElementById('guest-list');
const canvasEl = document.getElementById('canvas');
const toggleTitlesBtn = document.getElementById('toggle-titles');
const dialog = document.getElementById('details-dialog');

// 事件監聽與初始化
document.addEventListener('DOMContentLoaded', () => {
  initDefaultTables();
  render();

  // Excel 匯入
  document.getElementById('import-excel').addEventListener('change', handleExcelImport);
  
  // 檢視與控制
  toggleTitlesBtn.addEventListener('change', (e) => {
    state.showTitles = e.target.checked;
    render();
  });

  document.getElementById('add-table-btn').addEventListener('click', addTable);
  document.getElementById('add-guest-btn').addEventListener('click', () => openGuestModal());
  document.getElementById('reset-btn').addEventListener('click', resetSystem);

  // 匯出功能
  document.getElementById('export-excel-btn').addEventListener('click', exportExcel);
  document.getElementById('export-project-btn').addEventListener('click', exportProject);
  document.getElementById('import-project').addEventListener('change', importProject);

  // 縮放控制
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(state.zoomScale + 0.1));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(state.zoomScale - 0.1));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1.0));

  // 對話框按鈕
  document.getElementById('dialog-save-btn').addEventListener('click', saveGuestModal);
  document.getElementById('dialog-close-btn').addEventListener('click', () => dialog.close());
});

// 縮放 Canvas
function setZoom(scale) {
  state.zoomScale = Math.min(Math.max(0.5, scale), 1.5);
  canvasEl.style.transform = `scale(${state.zoomScale})`;
  document.getElementById('zoom-reset').innerText = `${Math.round(state.zoomScale * 100)}%`;
}

// 新增桌子
function addTable() {
  const newId = `t-${Date.now()}`;
  const tableIndex = state.tables.length + 1;
  state.tables.push({
    id: newId,
    name: `主桌 ${tableIndex}`,
    capacity: 10,
    seats: Array(10).fill(null)
  });
  render();
}

// 新增席位/減少席位
function updateCapacity(tableId, delta) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const newCap = table.capacity + delta;
  if (newCap < 1) return; // 至少需有 1 個位置

  if (delta > 0) {
    table.seats.push(...Array(delta).fill(null));
  } else {
    // 移除最後的位子（若有賓客則歸還至待排清單）
    const removedSeats = table.seats.splice(newCap);
    removedSeats.forEach(guestId => {
      if (guestId) {
        const g = state.guests.find(x => x.id === guestId);
        if (g) g.assignedTable = null;
      }
    });
  }
  table.capacity = newCap;
  render();
}

// 刪除單一桌子
function deleteTable(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;
  // 清空桌內賓客
  table.seats.forEach(guestId => {
    if (guestId) {
      const g = state.guests.find(x => x.id === guestId);
      if (g) g.assignedTable = null;
    }
  });
  state.tables = state.tables.filter(t => t.id !== tableId);
  render();
}

// 匯出單一桌子
function exportSingleTable(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const data = table.seats.map((guestId, index) => {
    const guest = state.guests.find(g => g.id === guestId);
    return {
      '座位號碼': index + 1,
      '單位': guest ? guest.dept : '',
      '頭銜': guest ? guest.title : '',
      '姓名': guest ? guest.name : '空位',
      '出席狀態': guest ? (guest.attending ? '出席' : '不出席') : '',
      '飲食習慣': guest ? guest.diet : '',
      '聯絡方式': guest ? guest.contact : '',
      '備註': guest ? guest.notes : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, table.name);
  XLSX.writeFile(wb, `${table.name}_名單.xlsx`);
}

// 處理 Excel 匯入
function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const bstr = evt.target.result;
    const wb = XLSX.read(bstr, { type: 'binary' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    const data = XLSX.utils.sheet_to_json(ws);

    // 解析資料格式
    const importedGuests = data.map((row, idx) => ({
      id: `g-${Date.now()}-${idx}`,
      dept: row['單位'] || '未指定單位',
      title: row['頭銜'] || '',
      name: row['姓名'] || '未知貴賓',
      diet: row['飲食習慣'] || '無',
      contact: row['聯絡方式'] || '',
      notes: row['備註'] || '',
      attending: true, // 匯入時預設出席
      assignedTable: null
    }));

    // 按單位進行排序以方便鄰近安排
    importedGuests.sort((a, b) => a.dept.localeCompare(b.dept, 'zh-TW'));
    
    state.guests.push(...importedGuests);
    render();
  };
  reader.readAsBinaryString(file);
}

// 編輯/新增貴賓 Modal 操作
function openGuestModal(guestId = null) {
  state.editingGuestId = guestId;
  const dialogTitle = document.getElementById('dialog-title');
  if (guestId) {
    dialogTitle.innerText = "編輯貴賓詳細資料";
    const g = state.guests.find(x => x.id === guestId);
    document.getElementById('dialog-dept').value = g.dept;
    document.getElementById('dialog-title-input').value = g.title;
    document.getElementById('dialog-name').value = g.name;
    document.getElementById('dialog-diet').value = g.diet;
    document.getElementById('dialog-contact').value = g.contact;
    document.getElementById('dialog-notes').value = g.notes;
  } else {
    dialogTitle.innerText = "新增貴賓";
    document.getElementById('details-form').reset();
  }
  dialog.showModal();
}

function saveGuestModal() {
  const dept = document.getElementById('dialog-dept').value;
  const name = document.getElementById('dialog-name').value;
  if (!dept || !name) {
    alert("請填寫單位與姓名！");
    return;
  }

  const title = document.getElementById('dialog-title-input').value;
  const diet = document.getElementById('dialog-diet').value;
  const contact = document.getElementById('dialog-contact').value;
  const notes = document.getElementById('dialog-notes').value;

  if (state.editingGuestId) {
    const g = state.guests.find(x => x.id === state.editingGuestId);
    if (g) {
      g.dept = dept; g.title = title; g.name = name;
      g.diet = diet; g.contact = contact; g.notes = notes;
    }
  } else {
    state.guests.push({
      id: `g-${Date.now()}`,
      dept, title, name, diet, contact, notes,
      attending: true,
      assignedTable: null
    });
  }
  dialog.close();
  render();
}

// 主要渲染邏輯
function render() {
  renderGuestList();
  renderCanvas();
}

// 渲染左側待排入貴賓清單
function renderGuestList() {
  guestListEl.innerHTML = '';
  const unassigned = state.guests.filter(g => !g.assignedTable);

  unassigned.forEach(guest => {
    const card = document.createElement('div');
    card.className = `guest-card ${guest.diet && guest.diet !== '無' ? 'has-diet' : ''} ${!guest.attending ? 'absent' : ''}`;
    card.draggable = true;

    // 拖拽事件
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'guest', id: guest.id }));
    });

    // 右鍵菜單（查看/編輯備註）
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      openGuestModal(guest.id);
    });

    const titleDisplay = state.showTitles && guest.title ? `<div class="guest-title">${guest.title}</div>` : '';

    card.innerHTML = `
      <div class="guest-info">
        <span class="guest-dept">${guest.dept}</span>
        <span class="guest-main">${guest.name}</span>
        ${titleDisplay}
      </div>
      <div class="guest-status-row">
        <span>出席狀態</span>
        <label class="switch-label">
          <input type="checkbox" ${guest.attending ? 'checked' : ''} data-id="${guest.id}">
          <span class="slider"></span>
        </label>
      </div>
    `;

    // 切換出席/不出席
    card.querySelector('input[type="checkbox"]').addEventListener('change', (e) => {
      guest.attending = e.target.checked;
      render();
    });

    guestListEl.appendChild(card);
  });
}

// 渲染桌圖區域
function renderCanvas() {
  canvasEl.innerHTML = '';

  state.tables.forEach((table, index) => {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';
    tableContainer.draggable = true;

    // 拖拖桌子對調事件
    tableContainer.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'table', tableId: table.id }));
    });

    tableContainer.addEventListener('dragover', (e) => e.preventDefault());
    tableContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      const rawData = e.dataTransfer.getData('text/plain');
      if (!rawData) return;
      const data = JSON.parse(rawData);

      if (data.type === 'table' && data.tableId !== table.id) {
        // 對調兩張桌子的數據
        const idx1 = state.tables.findIndex(t => t.id === data.tableId);
        const idx2 = state.tables.findIndex(t => t.id === table.id);
        const temp = state.tables[idx1];
        state.tables[idx1] = state.tables[idx2];
        state.tables[idx2] = temp;
        render();
      }
    });

    // 計算當前入座人數（不含空位）
    const occupiedCount = table.seats.filter(id => id !== null).length;

    // 桌子頂部控制按鈕
    const headerCtrls = document.createElement('div');
    headerCtrls.className = 'table-header-ctrls';
    headerCtrls.innerHTML = `
      <button class="add-seat">+位子</button>
      <button class="sub-seat">-位子</button>
      <button class="export-table">匯出單桌</button>
      <button class="del-table" style="color:#ef4444;">刪桌</button>
    `;

    headerCtrls.querySelector('.add-seat').onclick = () => updateCapacity(table.id, 1);
    headerCtrls.querySelector('.sub-seat').onclick = () => updateCapacity(table.id, -1);
    headerCtrls.querySelector('.export-table').onclick = () => exportSingleTable(table.id);
    headerCtrls.querySelector('.del-table').onclick = () => deleteTable(table.id);

    // 圓形桌子中心
    const circle = document.createElement('div');
    circle.className = 'table-circle';

    const titleInput = document.createElement('input');
    titleInput.className = 'table-title-input';
    titleInput.value = table.name;
    titleInput.addEventListener('change', (e) => {
      table.name = e.target.value;
    });

    const countDisplay = document.createElement('div');
    countDisplay.className = 'table-count';
    countDisplay.innerText = `${occupiedCount} / ${table.capacity}`;

    circle.appendChild(titleInput);
    circle.appendChild(countDisplay);

    // 渲染圍繞的席位 (Seats)
    const radius = 120; // 席位環繞半徑
    table.seats.forEach((guestId, seatIndex) => {
      const seat = document.createElement('div');
      const angle = (seatIndex / table.capacity) * (2 * Math.PI) - (Math.PI / 2);
      const x = 90 + radius * Math.cos(angle);
      const y = 90 + radius * Math.sin(angle);

      seat.style.left = `${x}px`;
      seat.style.top = `${y}px`;

      const guest = state.guests.find(g => g.id === guestId);

      seat.className = 'seat';
      if (guest) {
        seat.classList.add('occupied');
        if (guest.diet && guest.diet !== '無') seat.classList.add('has-diet');
        if (!guest.attending) seat.classList.add('absent');

        const titleText = state.showTitles && guest.title ? `<span style="font-size:0.6rem; color:#64748b;">${guest.title}</span>` : '';
        seat.innerHTML = `${titleText}<strong>${guest.name}</strong>`;
      } else {
        seat.innerText = `${seatIndex + 1}`;
      }

      seat.draggable = true;

      // 席位 Drag & Drop 事件
      seat.addEventListener('dragstart', (e) => {
        e.stopPropagation();
        e.dataTransfer.setData('text/plain', JSON.stringify({
          type: 'seat',
          fromTableId: table.id,
          fromSeatIndex: seatIndex,
          guestId: guestId
        }));
      });

      seat.addEventListener('dragover', (e) => e.preventDefault());
      seat.addEventListener('drop', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const rawData = e.dataTransfer.getData('text/plain');
        if (!rawData) return;
        const data = JSON.parse(rawData);

        if (data.type === 'guest') {
          // 從左側待排清單拖入
          const g = state.guests.find(x => x.id === data.id);
          if (g) {
            // 如果此位子原本有人，把原本的人還回清單
            if (table.seats[seatIndex]) {
              const oldGuest = state.guests.find(x => x.id === table.seats[seatIndex]);
              if (oldGuest) oldGuest.assignedTable = null;
            }
            table.seats[seatIndex] = g.id;
            g.assignedTable = table.id;
          }
        } else if (data.type === 'seat') {
          // 兩個席位之間交換位子
          const targetTable = state.tables.find(t => t.id === data.fromTableId);
          const sourceGuestId = targetTable.seats[data.fromSeatIndex];
          const targetGuestId = table.seats[seatIndex];

          targetTable.seats[data.fromSeatIndex] = targetGuestId;
          table.seats[seatIndex] = sourceGuestId;

          if (sourceGuestId) {
            const sg = state.guests.find(x => x.id === sourceGuestId);
            if (sg) sg.assignedTable = table.id;
          }
          if (targetGuestId) {
            const tg = state.guests.find(x => x.id === targetGuestId);
            if (tg) tg.assignedTable = targetTable.id;
          }
        }
        render();
      });

      // 右鍵查看賓客備註
      seat.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (guestId) openGuestModal(guestId);
      });

      circle.appendChild(seat);
    });

    tableContainer.appendChild(headerCtrls);
    tableContainer.appendChild(circle);
    canvasEl.appendChild(tableContainer);
  });
}

// 重置系統
function resetSystem() {
  if (confirm("確定要重置系統嗎？所有賓客與桌次將會還原！")) {
    state.guests = [];
    initDefaultTables();
    render();
  }
}

// 匯出全部 Excel
function exportExcel() {
  const data = state.guests.map(g => {
    let tableName = '未安排';
    if (g.assignedTable) {
      const t = state.tables.find(x => x.id === g.assignedTable);
      if (t) tableName = t.name;
    }
    return {
      '單位': g.dept,
      '頭銜': g.title,
      '姓名': g.name,
      '桌號': tableName,
      '出席狀態': g.attending ? '出席' : '不出席',
      '飲食習慣': g.diet,
      '聯絡方式': g.contact,
      '備註': g.notes
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "總尾牙名單");
  XLSX.writeFile(wb, "尾牙總排位名單.xlsx");
}

// 專案 JSON 匯出/匯入
function exportProject() {
  const jsonStr = JSON.stringify(state, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `尾牙排位專案_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function importProject(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      state = JSON.parse(evt.target.result);
      render();
    } catch (err) {
      alert("專案檔案格式錯誤！");
    }
  };
  reader.readAsText(file);
}