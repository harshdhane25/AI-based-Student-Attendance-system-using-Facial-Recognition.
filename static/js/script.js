// Global teacher config arrays (populated via AJAX).
let teacherClass = "";
let subjectList = [];
let specSubjectList = [];
let batchList = [];
let practicalSubjectList = [];

// Timetable parameters.
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlots = [
  '08.45 - 09.40', // index 0
  '09.40 - 10.35', // index 1
  '10.35 - 10.50', // index 2 -> Short Break (fixed)
  '10.50 - 11.45', // index 3
  '11.45 - 12.40', // index 4
  '12.40 - 01.40', // index 5 -> Lunch Break (fixed)
  '01.40 - 02.35', // index 6
  '02.35 - 03.30', // index 7
  '03.30 - 03.40', // index 8 -> Short Break (fixed)
  '03.40 - 04.30'  // index 9
];
// Mapping break indices to fixed texts.
const breakSlots = {
  2: "Short Break",
  5: "Lunch Break",
  8: "Short Break"
};

// Two-hour practical time slot definitions.
const practicalTimeSlots = [
  { label: '08.45 - 10.35', indices: [0, 1] },
  { label: '10.50 - 12.40', indices: [3, 4] },
  { label: '01.40 - 03.30', indices: [6, 7] }
];

let timetableData = {}; // Keys: "row-col-day"
let mergedCells = {};   // Keys: "row-col" mapped to an array of merged cell keys

// ------ Teacher Config Functions (AJAX calls) ------
function loadTeacherConfig() {
  if (!teacherClass) return;
  getConfig("subject");
  getConfig("specSubject");
  getConfig("batch");
  getConfig("practical");
}

function getConfig(type) {
  fetch(`/get_config?class=${teacherClass}&type=${type}`)
    .then(res => res.json())
    .then(data => {
      if (type === "subject") {
        subjectList = data;
        updateDisplay("subjectList", subjectList, "subject");
      } else if (type === "specSubject") {
        specSubjectList = data;
        updateDisplay("specSubjectList", specSubjectList, "specSubject");
      } else if (type === "batch") {
        batchList = data;
        updateDisplay("batchList", batchList);
      } else if (type === "practical") {
        practicalSubjectList = data;
        updateDisplay("practicalSubjectList", practicalSubjectList);
      }
    });
}

function addConfig(type) {
  if (!teacherClass) {
    alert("Please select a class first.");
    return;
  }
  let inputId = "";
  if (type === "subject") inputId = "subjectInput";
  else if (type === "specSubject") inputId = "specSubjectInput";
  else if (type === "batch") inputId = "batchInput";
  else if (type === "practical") inputId = "practicalSubjectInput";
  const value = document.getElementById(inputId).value.trim();
  if (!value) return;
  
  fetch('/add_config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({class: teacherClass, type: type, name: value})
  })
  .then(res => res.json())
  .then(data => {
    loadTeacherConfig();
    document.getElementById(inputId).value = "";
  });
}

function updateDisplay(elementId, arr, type="") {
  const span = document.getElementById(elementId);
  span.innerHTML = "";
  arr.forEach(item => {
    const spanItem = document.createElement("span");
    spanItem.textContent = item;
    const del = document.createElement("span");
    del.textContent = " ✕";
    del.className = "delete-btn";
    del.onclick = () => deleteConfig(type, item);
    spanItem.appendChild(del);
    span.appendChild(spanItem);
    span.appendChild(document.createTextNode(" | "));
  });
}

function deleteConfig(type, name) {
  if (!teacherClass) return;
  fetch('/delete_config', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({class: teacherClass, type: type, name: name})
  })
  .then(res => res.json())
  .then(data => loadTeacherConfig());
}

// When a class is selected, load both configuration and timetable.
function loadForSelectedClass() {
  teacherClass = document.getElementById("classSelect").value;
  if (!teacherClass) return;
  loadTeacherConfig();
  loadTimetable();
}

// ------ Modal & Dropdown Functions ------
function openModal() {
  if (!teacherClass) {
    alert("Please select a class first.");
    return;
  }
  populateDropdown("subjectSelect", subjectList);
  populateDropdown("specSubjectSelect", specSubjectList);
  populateDropdown("practicalSelect", practicalSubjectList);
  populateDropdown("batchSelect", batchList);
  document.getElementById("timeSlotSelect").innerHTML = "";
  document.getElementById("optionType").value = "";
  hideAllModalOptions();
  document.getElementById("popupModal").style.display = "flex";
}

function closeModal() {
  document.getElementById("popupModal").style.display = "none";
}

function hideAllModalOptions() {
  document.getElementById("subjectDropdown").style.display = "none";
  document.getElementById("specSubjectDropdown").style.display = "none";
  document.getElementById("practicalDropdown").style.display = "none";
  document.getElementById("timeSlotDiv").style.display = "none";
  document.getElementById("submitBtn").style.display = "none";
}

function populateDropdown(dropdownId, items) {
  const dropdown = document.getElementById(dropdownId);
  dropdown.innerHTML = '<option value="">--Select--</option>';
  items.forEach(item => {
    const opt = document.createElement("option");
    opt.value = item;
    opt.textContent = item;
    dropdown.appendChild(opt);
  });
}

function optionTypeChanged() {
  hideAllModalOptions();
  const optionType = document.getElementById("optionType").value;
  if (optionType === "subject") {
    document.getElementById("subjectDropdown").style.display = "block";
    populateTimeSlotsDropdown("one-hour");
  } else if (optionType === "specSubject") {
    document.getElementById("specSubjectDropdown").style.display = "block";
    populateTimeSlotsDropdown("one-hour");
  } else if (optionType === "practical") {
    document.getElementById("practicalDropdown").style.display = "block";
    populateTimeSlotsDropdown("two-hour");
  }
}

function populateTimeSlotsDropdown(type) {
  const timeSlotSelect = document.getElementById("timeSlotSelect");
  timeSlotSelect.innerHTML = '<option value="">--Select Time Slot--</option>';
  if (type === "one-hour") {
    timeSlots.forEach((slot, idx) => {
      if (breakSlots.hasOwnProperty(idx)) return;
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = slot;
      timeSlotSelect.appendChild(opt);
    });
  } else if (type === "two-hour") {
    practicalTimeSlots.forEach((slot, idx) => {
      const opt = document.createElement("option");
      opt.value = idx;
      opt.textContent = slot.label;
      timeSlotSelect.appendChild(opt);
    });
  }
  document.getElementById("timeSlotDiv").style.display = "block";
  document.getElementById("submitBtn").style.display = "block";
}

// ------ Timetable Functions ------
function inferMergedCells() {
  mergedCells = {};
  const mergeStarts = [0, 3, 6]; // indices where merges can start
  days.forEach((day, colIdx) => {
    mergeStarts.forEach(startIdx => {
      const mainKey = startIdx + "-" + colIdx + "-" + day;
      const nextKey = (startIdx + 1) + "-" + colIdx + "-" + day;
      if (timetableData[mainKey] && !timetableData[nextKey]) {
        const cellKey = startIdx + "-" + colIdx;
        const nextCellKey = (startIdx + 1) + "-" + colIdx;
        mergedCells[cellKey] = [cellKey, nextCellKey];
      }
    });
  });
}

function generateTable() {
  const table = document.getElementById("timetable");
  table.innerHTML = "";

  const header = table.insertRow();
  header.insertCell().textContent = "Time";
  days.forEach(day => header.insertCell().textContent = day);

  timeSlots.forEach((slot, rowIdx) => {
    const row = table.insertRow();
    row.insertCell().textContent = slot;

    days.forEach((day, colIdx) => {
      const cellKey = rowIdx + "-" + colIdx;
      if (breakSlots.hasOwnProperty(rowIdx)) {
        const cell = row.insertCell();
        cell.innerHTML = breakSlots[rowIdx];
        cell.style.fontWeight = "bold";
        cell.style.backgroundColor = "#f0f0f0";
      } else if (isMergedCell(cellKey)) {
        return;
      } else {
        const cell = row.insertCell();
        const contentKey = cellKey + "-" + day;
        let content = timetableData[contentKey] || "";

        if (mergedCells[cellKey]) {
          cell.rowSpan = mergedCells[cellKey].length;
        }

        if (content.includes("<br>")) {
          const items = content.split("<br>");
          cell.innerHTML = "";
          items.forEach((batch, i) => {
            const div = document.createElement("div");
            div.innerHTML = batch;
            const del = document.createElement("span");
            del.textContent = " [✕]";
            del.className = "delete-btn";
            del.onclick = () => {
              const filtered = items.filter(it => it !== batch);
              timetableData[contentKey] = filtered.join("<br>");
              if (!timetableData[contentKey]) delete timetableData[contentKey];
              autoSaveTimetable();
              generateTable();
            };
            div.appendChild(del);
            cell.appendChild(div);
          });
          const clearAll = document.createElement("button");
          clearAll.textContent = "Clear all";
          clearAll.onclick = () => {
            delete timetableData[contentKey];
            autoSaveTimetable();
            generateTable();
          };
          cell.appendChild(clearAll);
        } else {
          cell.innerHTML = content;
          if (content) {
            const del = document.createElement("span");
            del.textContent = " [✕]";
            del.className = "delete-btn";
            del.onclick = () => {
              delete timetableData[contentKey];
              autoSaveTimetable();
              generateTable();
            };
            cell.appendChild(del);
          }
        }
      }
    });
  });
}

function isMergedCell(cellKey) {
  for (const mainKey in mergedCells) {
    if (mergedCells[mainKey].includes(cellKey) && mainKey !== cellKey)
      return true;
  }
  return false;
}

function submitTimetableEntry() {
  const day = document.getElementById("daySelect").value;
  if (!day) { alert("Please select a day."); return; }
  const optionType = document.getElementById("optionType").value;
  if (!optionType) { alert("Please select an option type."); return; }
  let entry = "";
  if (optionType === "subject") {
    const subj = document.getElementById("subjectSelect").value;
    if (!subj) { alert("Please select a subject."); return; }
    entry = subj;
    const timeIdx = document.getElementById("timeSlotSelect").value;
    if (timeIdx === "") { alert("Please select a time slot."); return; }
    updateTimetableCell(day, parseInt(timeIdx), entry, optionType);
  } else if (optionType === "specSubject") {
    const spec = document.getElementById("specSubjectSelect").value;
    if (!spec) { alert("Please select a specialization subject."); return; }
    entry = spec;
    const timeIdx = document.getElementById("timeSlotSelect").value;
    if (timeIdx === "") { alert("Please select a time slot."); return; }
    updateTimetableCell(day, parseInt(timeIdx), entry, optionType);
  } else if (optionType === "practical") {
    const prac = document.getElementById("practicalSelect").value;
    if (!prac) { alert("Please select a practical subject."); return; }
    const batch = document.getElementById("batchSelect").value;
    if (!batch) { alert("Please select a batch."); return; }
    entry = "Batch " + batch + ": " + prac;
    const slotIdx = document.getElementById("timeSlotSelect").value;
    if (slotIdx === "") { alert("Please select a time slot."); return; }
    const indices = practicalTimeSlots[parseInt(slotIdx)].indices;
    updateTimetableCellPractical(day, indices, entry);
  }
  autoSaveTimetable();
  closeModal();
  generateTable();
}

// For one-hour updates (for specialization subjects, append if same cell).
function updateTimetableCell(day, timeIndex, content, optionType) {
  const dayIdx = days.indexOf(day);
  const cellKey = timeIndex + "-" + dayIdx;
  const key = cellKey + "-" + day;
  if (timetableData[key] && optionType === "specSubject") {
    if (!timetableData[key].includes(content))
      timetableData[key] += "<br>" + content;
  } else {
    timetableData[key] = content;
  }
}

// For practical subject: update two adjacent cells (merged).
function updateTimetableCellPractical(day, indices, content) {
  const dayIdx = days.indexOf(day);
  const mainCellKey = indices[0] + "-" + dayIdx;
  const key = mainCellKey + "-" + day;
  let current = timetableData[key] || "";

  const [newBatchLabel, newSubject] = content.split(":").map(x => x.trim());

  if (current) {
    const entries = current.split("<br>");
    const existingBatches = entries.map(entry => entry.split(":")[0].trim());

    if (existingBatches.includes(newBatchLabel)) {
      alert(`Cannot add: Batch ${newBatchLabel} already exists in this block.`);
      return;
    }

    timetableData[key] += "<br>" + content;
  } else {
    timetableData[key] = content;
  }

  const mergedGroup = indices.map(idx => idx + "-" + dayIdx);
  mergedCells[mergedGroup[0]] = mergedGroup;
}



// ------ Save/Load Timetable Functions ------
function autoSaveTimetable() {
  saveTimetable();
}

function saveTimetable() {
  const data = {};
  timeSlots.forEach((slot, rowIdx) => {
    data[slot] = {};
    days.forEach((day, colIdx) => {
      const cellKey = rowIdx + "-" + colIdx;
      const key = cellKey + "-" + day;
      if (breakSlots.hasOwnProperty(rowIdx)) {
        data[slot][day] = breakSlots[rowIdx];
      } else {
        data[slot][day] = timetableData[key] || "";
      }
    });
  });
  const payload = {
    class: teacherClass,
    timetable: data
  };
  fetch('/save', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify(payload)
  })
  .then(res => res.json())
  .then(res => alert(res.message));
}

function loadTimetable() {
  if (!teacherClass) return;
  fetch('/load?class=' + teacherClass)
    .then(res => res.json())
    .then(data => {
      timetableData = {};
      for (const slot in data) {
        for (const day in data[slot]) {
          const rowIdx = timeSlots.indexOf(slot);
          const colIdx = days.indexOf(day);
          if (rowIdx >= 0 && colIdx >= 0) {
            const key = rowIdx + "-" + colIdx + "-" + day;
            timetableData[key] = data[slot][day];
          }
        }
      }
      inferMergedCells();
      generateTable();
    });
}

function downloadExcel() {
  if (!teacherClass) {
    alert("Please select a class.");
    return;
  }
  window.location.href = `/download_excel?class=${teacherClass}`;
}

window.onload = function() {
  generateTable();
}