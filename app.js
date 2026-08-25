// 可選 7 種淡色調
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
  deptColors: {}
};

// 初始化預設 3 張桌子
function initDefaultTables() {
  state.tables = [
    { id: 't-1', name: '主桌 1', capacity: 10, seats: Array(10).fill(null) },
    { id: 't-2', name: '主桌 2', capacity: 10, seats: Array(10).fill(null) },
    { id: 't-3', name: '主桌 3', capacity: 10, seats: Array(10).fill(null) }
  ];
}

// DOM 元素引用
const guestListEl = document.getElementById('guest-list');
const canvasEl = document.getElementById('canvas');
const detailsDialog = document.getElementById('details-dialog');
const tableModal = document.getElementById('table-modal');
const colorModal = document.getElementById('color-modal');

document.addEventListener('DOMContentLoaded', () => {
  initDefaultTables();
  render();

  // 1. 綁定 Excel 匯入事件
  const excelInput = document.getElementById('import-excel');
  if (excelInput) {
    excelInput.addEventListener('change', handleExcelImport);
  }

  // 2. 顯示頭銜開關
  document.getElementById('toggle-titles').addEventListener('change', (e) => {
    state.showTitles = e.target.checked;
    render();
  });

  // 3. 按鈕動作綁定
  document.getElementById('add-table-btn').addEventListener('click', addTable);
  document.getElementById('modal-add-guest-btn').addEventListener('click', () => openDetailsModal());
  document.getElementById('reset-btn').addEventListener('click', resetSystem);

  // 4. 查看貴賓資料大表格
  document.getElementById('open-table-modal-btn').addEventListener('click', openTableModal);
  document.getElementById('table-modal-close').addEventListener('click', () => tableModal.close());
  document.getElementById('export-excel-btn').addEventListener('click', exportExcel);

  // 5. 顏色設定
  document.getElementById('open-color-picker-btn').addEventListener('click', openColorModal);
  document.getElementById('color-modal-close').addEventListener('click', () => colorModal.close());

  // 6. 專案 JSON 匯入/匯出
  document.getElementById('export-project-btn').addEventListener('click', exportProject);
  document.getElementById('import-project').addEventListener('change', importProject);

  // 7. 縮放控制
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(state.zoomScale + 0.1));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(state.zoomScale - 0.1));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1.0));

  // 8. 貴賓儲存/關閉
  document.getElementById('dialog-save-btn').addEventListener('click', saveGuestDetails);
  document.getElementById('dialog-close-btn').addEventListener('click', () => detailsDialog.close());
});

// 取得單位顏色
function getDeptColor(dept) {
  if (!dept) return '#ffffff';
  if (!state.deptColors[dept]) {
    const usedCount = Object.keys(state.deptColors).length;
    state.deptColors[dept] = PALETTE[usedCount % PALETTE.length].code;
  }
  return state.deptColors[dept];
}

// 飲食需求外框樣式
function getDietClass(diet) {
  if (!diet || diet.trim() === '' || diet === '無') return '';
  if (diet.includes('素')) return 'has-diet-vegetarian';
  return 'has-diet-special';
}

// 設定畫布縮放
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

// 調整座位數
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

  if (confirm(`確定要刪除「${table.name}」嗎？桌上貴賓將放回待排清單。`)) {
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

// 調換兩桌位置
function swapTables(sourceTableId, targetTableId) {
  if (!sourceTableId || !targetTableId || sourceTableId === targetTableId) return;
  const idx1 = state.tables.findIndex(t => t.id === sourceTableId);
  const idx2 = state.tables.findIndex(t => t.id === targetTableId);

  if (idx1 !== -1 && idx2 !== -1) {
    const temp = state.tables[idx1];
    state.tables[idx1] = state.tables[idx2];
    state.tables[idx2] = temp;
    render();
  }
}

// 主渲染函式
function render() {
  renderGuestList();
  renderCanvas();
}

// 渲染左側待排清單
function renderGuestList() {
  guestListEl.innerHTML = '';

  state.guests.forEach(guest => {
    const card = document.createElement('div');
    const color = getDeptColor(guest.dept);
    const dietClass = getDietClass(guest.diet);

    card.className = `guest-card ${dietClass} ${!guest.attending ? 'absent' : ''}`;
    card.style.backgroundColor = color;
    card.draggable = true;

    // 拖拉貴賓卡片
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'guest', guestId: guest.id }));
    });

    // 點擊左鍵：檢視與修改
    card.addEventListener('click', () => openDetailsModal(guest.id));

    // 右鍵：刪除貴賓
    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      if (confirm(`確定要刪除貴賓「${guest.name}」嗎？`)) {
        deleteGuest(guest.id);
      }
    });

    let assignedBadge = '';
    if (guest.assignedTable) {
      const table = state.tables.find(t => t.id === guest.assignedTable);
      if (table) {
        assignedBadge = `<span class="guest-assigned-badge">${table.name}</span>`;
      }
    }

    const titleHtml = state.showTitles && guest.title ? `<span class="guest-title-text">(${guest.title})</span>` : '';
    const isShortName = guest.name && guest.name.length <= 3;
    const nameClass = isShortName ? 'guest-name name-short' : 'guest-name';

    card.innerHTML = `
      <div class="guest-main-info">
        <span class="guest-dept">${guest.dept}</span>
        <div class="guest-name-row">
          <span class="${nameClass}">${guest.name}</span>
          ${titleHtml}
          ${assignedBadge}
        </div>
      </div>
      <div class="attendance-toggle">
        <button class="attendance-btn ${guest.attending ? 'active-attending' : ''}" data-status="true">出席</button>
        <button class="attendance-btn ${!guest.attending ? 'active-absent' : ''}" data-status="false">取消</button>
      </div>
    `;

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
    tableContainer.draggable = true; // 允許桌子被拖拉

    // 桌子拖拉與交換邏輯
    tableContainer.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'table', tableId: table.id }));
    });

    tableContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      tableContainer.classList.add('drag-over');
    });

    tableContainer.addEventListener('dragleave', () => {
      tableContainer.classList.remove('drag-over');
    });

    tableContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      tableContainer.classList.remove('drag-over');
      const raw = e.dataTransfer.getData('text/plain');
      if (!raw) return;

      try {
        const data = JSON.parse(raw);
        if (data.type === 'table') {
          swapTables(data.tableId, table.id);
        }
      } catch (err) { }
    });

    // 桌子圓心
    const circle = document.createElement('div');
    circle.className = 'table-circle';

    circle.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      deleteTable(table.id);
    });

    // 桌名輸入框
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

    // 控制按鈕
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

    // 環形席位渲染
    const radius = 125;
    table.seats.forEach((guestId, seatIndex) => {
      const seat = document.createElement('div');
      const angle = (seatIndex / table.capacity) * (2 * Math.PI) - (Math.PI / 2);
      const x = 95 + radius * Math.cos(angle);
      const y = 95 + radius * Math.sin(angle);

      seat.style.left = `${x}px`;
      seat.style.top = `${y}px`;
      seat.className = 'seat';

      // 1 號位顯示「主」字黃色標籤
      if (seatIndex === 0) {
        const hostBadge = document.createElement('div');
        hostBadge.className = 'host-badge';
        hostBadge.innerText = '主';
        seat.appendChild(hostBadge);
      }

      const guest = state.guests.find(g => g.id === guestId);

      if (guest) {
        seat.classList.add('occupied');
        seat.style.backgroundColor = getDeptColor(guest.dept);

        const dietClass = getDietClass(guest.diet);
        if (dietClass) seat.classList.add(dietClass);
        if (!guest.attending) seat.classList.add('absent');

        const titleText = state.showTitles && guest.title ? `<span style="font-size:0.6rem; color:#64748b;">${guest.title}</span>` : '';
        const isShortName = guest.name && guest.name.length <= 3;
        const nameSpan = `<strong class="${isShortName ? 'name-short' : ''}">${guest.name}</strong>`;

        seat.innerHTML += `${titleText}${nameSpan}`;
        seat.draggable = true;
      } else {
        const numSpan = document.createElement('span');
        numSpan.innerText = `${seatIndex + 1}`;
        seat.appendChild(numSpan);
      }

      // 座位拖拉邏輯
      seat.addEventListener('dragstart', (e) => {
        if (guestId) {
          e.stopPropagation();
          e.dataTransfer.setData('text/plain', JSON.stringify({
            type: 'seat',
            sourceTableId: table.id,
            sourceSeatIndex: seatIndex,
            guestId: guestId
          }));
        }
      });

      seat.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        seat.classList.add('drag-over');
      });

      seat.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        seat.classList.remove('drag-over');
      });

      seat.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        seat.classList.remove('drag-over');

        const raw = e.dataTransfer.getData('text/plain');
        if (!raw) return;

        try {
          const data = JSON.parse(raw);

          if (data.type === 'guest') {
            // 從待排名單放置席位
            const draggedGuest = state.guests.find(g => g.id === data.guestId);
            if (draggedGuest) {
              if (draggedGuest.assignedTable) {
                const oldTable = state.tables.find(t => t.id === draggedGuest.assignedTable);
                if (oldTable) {
                  const oldIdx = oldTable.seats.indexOf(draggedGuest.id);
                  if (oldIdx !== -1) oldTable.seats[oldIdx] = null;
                }
              }
              if (table.seats[seatIndex]) {
                const prevGuest = state.guests.find(g => g.id === table.seats[seatIndex]);
                if (prevGuest) prevGuest.assignedTable = null;
              }

              table.seats[seatIndex] = draggedGuest.id;
              draggedGuest.assignedTable = table.id;
              render();
            }
          } else if (data.type === 'seat') {
            // 座位對調
            const srcTable = state.tables.find(t => t.id === data.sourceTableId);
            if (srcTable) {
              const targetGuestId = table.seats[seatIndex];
              const srcGuestId = data.guestId;

              srcTable.seats[data.sourceSeatIndex] = targetGuestId;
              table.seats[seatIndex] = srcGuestId;

              if (srcGuestId) {
                const sg = state.guests.find(g => g.id === srcGuestId);
                if (sg) sg.assignedTable = table.id;
              }
              if (targetGuestId) {
                const tg = state.guests.find(g => g.id === targetGuestId);
                if (tg) tg.assignedTable = srcTable.id;
              }

              render();
            }
          }
        } catch (err) { }
      });

      // 點擊檢視/修改
      seat.addEventListener('click', (e) => {
        e.stopPropagation();
        if (guestId) {
          openDetailsModal(guestId);
        }
      });

      // 右鍵移除席位貴賓
      seat.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (guestId) {
          if (confirm('確定要將此貴賓移出座位嗎？')) {
            const g = state.guests.find(x => x.id === guestId);
            if (g) g.assignedTable = null;
            table.seats[seatIndex] = null;
            render();
          }
        } else {
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
  state.tables.forEach(table => {
    const idx = table.seats.indexOf(guestId);
    if (idx !== -1) table.seats[idx] = null;
  });

  state.guests = state.guests.filter(g => g.id !== guestId);
  render();
  renderTableModalRows();
}

// 開啟貴賓大表格
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
      <td class="col-table"><strong>${tableName}</strong></td>
      <td><input type="text" value="${guest.dept}" data-field="dept"></td>
      <td><input type="text" value="${guest.title}" data-field="title"></td>
      <td><input type="text" value="${guest.name}" data-field="name"></td>
      <td><input type="text" value="${guest.diet}" data-field="diet"></td>
      <td><input type="text" value="${guest.contact}" data-field="contact"></td>
      <td><input type="text" value="${guest.notes}" data-field="notes"></td>
      <td class="col-action"><button class="btn btn-xs btn-danger">刪除</button></td>
    `;

    tr.querySelectorAll('input').forEach(input => {
      input.addEventListener('change', (e) => {
        const field = e.target.dataset.field;
        guest[field] = e.target.value;
        render();
      });
    });

    tr.querySelector('.btn-danger').addEventListener('click', () => {
      if (confirm(`確定要刪除「${guest.name}」嗎？`)) {
        deleteGuest(guest.id);
      }
    });

    tbody.appendChild(tr);
  });
}

// 顏色 Modal
function openColorModal() {
  const list = document.getElementById('color-settings-list');
  list.innerHTML = '';

  const depts = [...new Set(state.guests.map(g => g.dept))];
  if (depts.length === 0) {
    list.innerHTML = '<div style="text-align:center; color:#94a3b8; padding:20px;">尚無單位資料</div>';
  } else {
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
        openColorModal();
      });

      list.appendChild(item);
    });
  }

  colorModal.showModal();
}

// 單一貴賓彈窗
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
  renderTableModalRows();
}

// Excel 匯入解析（過濾相同姓名）
function handleExcelImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (evt) => {
    try {
      const wb = XLSX.read(evt.target.result, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);

      // 取得已有貴賓名單（比對姓名）
      const existingNames = new Set(state.guests.map(g => g.name.trim()));

      let importedCount = 0;
      const newGuests = [];

      data.forEach((row, idx) => {
        const name = (row['姓名'] || '').toString().trim();
        if (name && !existingNames.has(name)) {
          newGuests.push({
            id: `g-${Date.now()}-${idx}`,
            dept: row['單位'] || '未指定單位',
            title: row['頭銜'] || '',
            name: name,
            diet: row['飲食習慣'] || '無',
            contact: row['聯絡方式'] || '',
            notes: row['備註'] || '',
            attending: true,
            assignedTable: null
          });
          existingNames.add(name);
          importedCount++;
        }
      });

      if (newGuests.length > 0) {
        state.guests.push(...newGuests);
        render();
        renderTableModalRows();
        alert(`成功匯入 ${importedCount} 筆新貴賓資料！`);
      } else {
        alert('未匯入任何新資料（匯入清單中的姓名皆已存在）。');
      }
    } catch (err) {
      alert('解析 Excel 檔案失敗，請確認檔案格式是否正確！');
    }
    e.target.value = ''; // 清空檔案選擇器，以便重複選擇同一個檔案
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

// 專案匯出/匯入/重置
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
    e.target.value = '';
  };
  reader.readAsText(file);
}

function resetSystem() {
  if (confirm("確定要重置系統嗎？所有資料將清空！")) {
    state.guests = [];
    state.deptColors = {};
    initDefaultTables();
    render();
  }
}
