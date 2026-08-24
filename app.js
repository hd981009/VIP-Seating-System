// 可選的 7 種淡色調
const PALETTE = [
  { name: '淡黃', code: '#fef9c3' },
  { name: '淡藍', code: '#e0f2fe' },
  { name: '淡綠', code: '#dcfce7' },
  { name: '淡紅', code: '#fee2e2' },
  { name: '淡橘', code: '#ffedd5' },
  { name: '淡紫', code: '#f3e8ff' },
  { name: '純白', code: '#ffffff' }
];

// 全域狀態
let state = {
  guests: [],
  tables: [],
  showTitles: true,
  zoomScale: 1.0,
  selectedGuestId: null, // 當前點擊選取的貴賓
  deptColors: {} // 單位對應顏色 code
};

// 初始化預設桌子
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
const detailsDialog = document.getElementById('details-dialog');
const tableModal = document.getElementById('table-modal');
const colorModal = document.getElementById('color-modal');

document.addEventListener('DOMContentLoaded', () => {
  initDefaultTables();
  render();

  // 頂部與邊欄控制項
  document.getElementById('import-excel').addEventListener('change', handleExcelImport);
  document.getElementById('toggle-titles').addEventListener('change', (e) => {
    state.showTitles = e.target.checked;
    render();
  });

  document.getElementById('add-table-btn').addEventListener('click', addTable);
  document.getElementById('add-guest-btn').addEventListener('click', () => openDetailsModal());
  document.getElementById('reset-btn').addEventListener('click', resetSystem);

  // 查看貴賓資料大表格
  document.getElementById('open-table-modal-btn').addEventListener('click', openTableModal);
  document.getElementById('table-modal-close').addEventListener('click', () => tableModal.close());
  document.getElementById('export-excel-btn').addEventListener('click', exportExcel);

  // 單位顏色設定
  document.getElementById('open-color-picker-btn').addEventListener('click', openColorModal);
  document.getElementById('color-modal-close').addEventListener('click', () => colorModal.close());

  // 專案 JSON 匯入/匯出
  document.getElementById('export-project-btn').addEventListener('click', exportProject);
  document.getElementById('import-project').addEventListener('change', importProject);

  // 畫布縮放
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(state.zoomScale + 0.1));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(state.zoomScale - 0.1));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1.0));

  // 單一貴賓儲存
  document.getElementById('dialog-save-btn').addEventListener('click', saveGuestDetails);
  document.getElementById('dialog-close-btn').addEventListener('click', () => detailsDialog.close());
});

// 顏色分配邏輯
function getDeptColor(dept) {
  if (!dept) return '#ffffff';
  if (!state.deptColors[dept]) {
    // 依序循環指派預設顏色
    const usedCount = Object.keys(state.deptColors).length;
    state.deptColors[dept] = PALETTE[usedCount % PALETTE.length].code;
  }
  return state.deptColors[dept];
}

// 縮放設定
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

// 加/減席位
function updateCapacity(tableId, delta) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const newCap = table.capacity + delta;
  if (newCap < 1) return;

  if (delta > 0) {
    table.seats.push(...Array(delta).fill(null));
  } else {
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

// 刪除桌子
function deleteTable(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  if (confirm(`確定要刪除「${table.name}」嗎？桌上賓客將歸還至待排清單。`)) {
    table.seats.forEach(guestId => {
      if (guestId) {
        const g = state.guests.find(x => x.id === guestId);
        if (g) g.assignedTable = null;
      }
    });
    state.tables = state.tables.filter(t => t.id !== tableId);
    render();
  }
}

// 主要渲染
function render() {
  renderGuestList();
  renderCanvas();
}

// 渲染左側貴賓清單
function renderGuestList() {
  guestListEl.innerHTML = '';

  state.guests.forEach(guest => {
    const card = document.createElement('div');
    const color = getDeptColor(guest.dept);

    card.className = `guest-card 
      ${state.selectedGuestId === guest.id ? 'selected' : ''} 
      ${guest.diet && guest.diet !== '無' ? 'has-diet' : ''} 
      ${!guest.attending ? 'absent' : ''}`;
    card.style.backgroundColor = color;

    // 左鍵點擊選擇
    card.addEventListener('click', () => {
      if (state.selectedGuestId === guest.id) {
        state.selectedGuestId = null; // 取消選擇
      } else {
        state.selectedGuestId = guest.id;
      }
      render();
    });

    // 右鍵刪除
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (confirm(`確定要刪除貴賓「${guest.name}」嗎？`)) {
        deleteGuest(guest.id);
      }
    });

    // 取得分配桌名
    let assignedBadge = '';
    if (guest.assignedTable) {
      const table = state.tables.find(t => t.id === guest.assignedTable);
      if (table) {
        assignedBadge = `<span class="guest-assigned-badge">${table.name}</span>`;
      }
    }

    const titleHtml = state.showTitles && guest.title ? `<span class="guest-title-text">(${guest.title})</span>` : '';

    card.innerHTML = `
      <div class="guest-main-info">
        <span class="guest-dept">${guest.dept}</span>
        <div class="guest-name-row">
          <span class="guest-name">${guest.name}</span>
          ${titleHtml}
          ${assignedBadge}
        </div>
      </div>
      <div class="attendance-toggle">
        <button class="attendance-btn ${guest.attending ? 'active-attending' : ''}" data-status="true">出席</button>
        <button class="attendance-btn ${!guest.attending ? 'active-absent' : ''}" data-status="false">取消</button>
      </div>
    `;

    // 出席狀態切換
    card.querySelectorAll('.attendance-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        guest.attending = (btn.dataset.status === 'true');
        render();
      });
    });

    guestListEl.appendChild(card);
  });
}

// 渲染畫布區域
function renderCanvas() {
  canvasEl.innerHTML = '';

  state.tables.forEach(table => {
    const tableContainer = document.createElement('div');
    tableContainer.className = 'table-container';

    // 圓形桌體
    const circle = document.createElement('div');
    circle.className = 'table-circle';

    // 桌子右鍵：刪除提示
    circle.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      deleteTable(table.id);
    });

    // 桌名可直接編輯
    const titleInput = document.createElement('input');
    titleInput.className = 'table-title-input';
    titleInput.value = table.name;
    titleInput.addEventListener('change', (e) => {
      table.name = e.target.value;
      renderGuestList();
    });

    const occupiedCount = table.seats.filter(id => id !== null).length;
    const countDisplay = document.createElement('div');
    countDisplay.className = 'table-count';
    countDisplay.innerText = `${occupiedCount} / ${table.capacity}`;

    // 桌內加減按鈕
    const innerCtrls = document.createElement('div');
    innerCtrls.className = 'table-inner-ctrls';

    const addBtn = document.createElement('button');
    addBtn.className = 'table-inner-btn';
    addBtn.innerText = '+';
    addBtn.onclick = (e) => { e.stopPropagation(); updateCapacity(table.id, 1); };

    const subBtn = document.createElement('button');
    subBtn.className = 'table-inner-btn';
    subBtn.innerText = '-';
    subBtn.onclick = (e) => { e.stopPropagation(); updateCapacity(table.id, -1); };

    innerCtrls.appendChild(addBtn);
    innerCtrls.appendChild(subBtn);

    const exportBtn = document.createElement('button');
    exportBtn.className = 'export-single-btn';
    exportBtn.innerText = '匯出單桌';
    exportBtn.onclick = (e) => { e.stopPropagation(); exportSingleTable(table.id); };

    circle.appendChild(titleInput);
    circle.appendChild(countDisplay);
    circle.appendChild(innerCtrls);
    circle.appendChild(exportBtn);

    // 渲染席位
    const radius = 120;
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
        seat.style.backgroundColor = getDeptColor(guest.dept);

        if (guest.diet && guest.diet !== '無') seat.classList.add('has-diet');
        if (!guest.attending) seat.classList.add('absent');

        // 閃爍提示：如果當前選中的人正好在這個位置
        if (state.selectedGuestId === guest.id) {
          seat.classList.add('highlight-blink');
        }

        const titleText = state.showTitles && guest.title ? `<span style="font-size:0.6rem; color:#64748b;">${guest.title}</span>` : '';
        seat.innerHTML = `${titleText}<strong>${guest.name}</strong>`;
      } else {
        seat.innerText = `${seatIndex + 1}`;
      }

      // 左鍵點擊席位邏輯
      seat.addEventListener('click', () => {
        if (state.selectedGuestId) {
          // 如果左側有選中的賓客 ➔ 安排入座
          const selectedGuest = state.guests.find(g => g.id === state.selectedGuestId);
          if (selectedGuest) {
            // 清除原位置
            if (selectedGuest.assignedTable) {
              const oldTable = state.tables.find(t => t.id === selectedGuest.assignedTable);
              if (oldTable) {
                const oldSeatIndex = oldTable.seats.indexOf(selectedGuest.id);
                if (oldSeatIndex !== -1) oldTable.seats[oldSeatIndex] = null;
              }
            }

            // 如果該位置原本有人，原來的賓客退回待排
            if (table.seats[seatIndex]) {
              const prevGuest = state.guests.find(g => g.id === table.seats[seatIndex]);
              if (prevGuest) prevGuest.assignedTable = null;
            }

            table.seats[seatIndex] = selectedGuest.id;
            selectedGuest.assignedTable = table.id;
            state.selectedGuestId = null; // 排完清除選取
            render();
          }
        } else if (guestId) {
          // 沒有選中左側，點擊已入座席位 ➔ 查看資料
          openDetailsModal(guestId);
        }
      });

      // 席位右鍵 ➔ 刪除/移出位子
      seat.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (guestId) {
          if (confirm('確定要將此位貴賓移出座位嗎？')) {
            const g = state.guests.find(x => x.id === guestId);
            if (g) g.assignedTable = null;
            table.seats[seatIndex] = null;
            render();
          }
        } else {
          // 點擊空席位右鍵可減少該桌位數
          updateCapacity(table.id, -1);
        }
      });

      circle.appendChild(seat);
    });

    tableContainer.appendChild(circle);
    canvasEl.appendChild(tableContainer);
  });
}

// 刪除貴賓
function deleteGuest(guestId) {
  // 從桌圖中清除
  state.tables.forEach(table => {
    const idx = table.seats.indexOf(guestId);
    if (idx !== -1) table.seats[idx] = null;
  });

  state.guests = state.guests.filter(g => g.id !== guestId);
  if (state.selectedGuestId === guestId) state.selectedGuestId = null;
  render();
  renderTableModalRows(); // 同步更新大表格
}

// 開啟查看貴賓資料大表格
function openTableModal() {
  renderTableModalRows();
  tableModal.showModal();
}

function renderTableModalRows() {
  const tbody = document.getElementById('guest-table-body');
  tbody.innerHTML = '';

  state.guests.forEach(guest => {
    let tableName = '未安排';
    if (guest.assignedTable) {
      const t = state.tables.find(x => x.id === guest.assignedTable);
      if (t) tableName = t.name;
    }

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${tableName}</strong></td>
      <td><input type="text" value="${guest.dept}" data-field="dept"></td>
      <td><input type="text" value="${guest.title}" data-field="title"></td>
      <td><input type="text" value="${guest.name}" data-field="name"></td>
      <td><input type="text" value="${guest.diet}" data-field="diet"></td>
      <td><input type="text" value="${guest.contact}" data-field="contact"></td>
      <td><input type="text" value="${guest.notes}" data-field="notes"></td>
      <td><button class="btn btn-xs btn-danger">刪除</button></td>
    `;

    // 即時編輯欄位
    tr.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        guest[field] = e.target.value;
        render();
      });
    });

    // 刪除按鈕
    tr.querySelector('.btn-danger').addEventListener('click', () => {
      if (confirm(`確定要刪除「${guest.name}」嗎？`)) {
        deleteGuest(guest.id);
      }
    });

    tbody.appendChild(tr);
  });
}

// 開啟單位顏色對話框
function openColorModal() {
  const list = document.getElementById('color-settings-list');
  list.innerHTML = '';

  const depts = [...new Set(state.guests.map(g => g.dept))];
  depts.forEach(dept => {
    const item = document.createElement('div');
    item.className = 'color-item';
    item.style.backgroundColor = getDeptColor(dept);

    let options = PALETTE.map(p => 
      `<option value="${p.code}" ${getDeptColor(dept) === p.code ? 'selected' : ''}>${p.name}</option>`
    ).join('');

    item.innerHTML = `
      <strong>${dept}</strong>
      <select>${options}</select>
    `;

    item.querySelector('select').addEventListener('change', (e) => {
      state.deptColors[dept] = e.target.value;
      render();
      openColorModal(); // 刷新背景色
    });

    list.appendChild(item);
  });

  colorModal.showModal();
}

// 開啟單一貴賓 Modal
function openDetailsModal(guestId = null) {
  state.editingGuestId = guestId;
  if (guestId) {
    const g = state.guests.find(x => x.id === guestId);
    document.getElementById('dialog-dept').value = g.dept;
    document.getElementById('dialog-title-input').value = g.title;
    document.getElementById('dialog-name').value = g.name;
    document.getElementById('dialog-diet').value = g.diet;
    document.getElementById('dialog-contact').value = g.contact;
    document.getElementById('dialog-notes').value = g.notes;
  } else {
    document.getElementById('details-form').reset();
  }
  detailsDialog.showModal();
}

function saveGuestDetails() {
  const dept = document.getElementById('dialog-dept').value;
  const name = document.getElementById('dialog-name').value;
  if (!dept || !name) {
    alert('請填寫單位與姓名！');
    return;
  }

  if (state.editingGuestId) {
    const g = state.guests.find(x => x.id === state.editingGuestId);
    if (g) {
      g.dept = dept;
      g.title = document.getElementById('dialog-title-input').value;
      g.name = name;
      g.diet = document.getElementById('dialog-diet').value;
      g.contact = document.getElementById('dialog-contact').value;
      g.notes = document.getElementById('dialog-notes').value;
    }
  } else {
    state.guests.push({
      id: `g-${Date.now()}`,
      dept,
      title: document.getElementById('dialog-title-input').value,
      name,
      diet: document.getElementById('dialog-diet').value || '無',
      contact: document.getElementById('dialog-contact').value,
      notes: document.getElementById('dialog-notes').value,
      attending: true,
      assignedTable: null
    });
  }

  detailsDialog.close();
  render();
}

// 匯入 Excel
function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    const wb = XLSX.read(evt.target.result, { type: 'binary' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const imported = data.map((row, idx) => ({
      id: `g-${Date.now()}-${idx}`,
      dept: row['單位'] || '未指定單位',
      title: row['頭銜'] || '',
      name: row['姓名'] || '未知貴賓',
      diet: row['飲食習慣'] || '無',
      contact: row['聯絡方式'] || '',
      notes: row['備註'] || '',
      attending: true,
      assignedTable: null
    }));

    state.guests.push(...imported);
    render();
  };
  reader.readAsBinaryString(file);
}

// 匯出 Excel
function exportExcel() {
  const data = state.guests.map(g => {
    let tableName = '未安排';
    if (g.assignedTable) {
      const t = state.tables.find(x => x.id === g.assignedTable);
      if (t) tableName = t.name;
    }
    return {
      '桌次': tableName,
      '單位': g.dept,
      '頭銜': g.title,
      '姓名': g.name,
      '出席狀態': g.attending ? '出席' : '不出席',
      '飲食習慣': g.diet,
      '聯絡方式': g.contact,
      '備註': g.notes
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "尾牙貴賓名單");
  XLSX.writeFile(wb, "尾牙總排位名單.xlsx");
}

// 匯出單桌 Excel
function exportSingleTable(tableId) {
  const table = state.tables.find(t => t.id === tableId);
  if (!table) return;

  const data = table.seats.map((guestId, index) => {
    const g = state.guests.find(x => x.id === guestId);
    return {
      '座位號碼': index + 1,
      '單位': g ? g.dept : '',
      '頭銜': g ? g.title : '',
      '姓名': g ? g.name : '空位',
      '出席狀態': g ? (g.attending ? '出席' : '不出席') : '',
      '飲食習慣': g ? g.diet : '',
      '聯絡方式': g ? g.contact : '',
      '備註': g ? g.notes : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, table.name);
  XLSX.writeFile(wb, `${table.name}_名單.xlsx`);
}

// 專案 JSON 匯出/匯入/重置
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

function resetSystem() {
  if (confirm("確定要重置系統嗎？所有資料將清空！")) {
    state.guests = [];
    state.selectedGuestId = null;
    state.deptColors = {};
    initDefaultTables();
    render();
  }
}
