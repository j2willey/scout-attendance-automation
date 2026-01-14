/**
 * PROCESS ATTENDANCE BATCH (V6 - Final File Verification)
 */
function processAttendanceBatch() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- SHEETS ---
  const SHEET_STAGING = ss.getSheetByName("Form Responses 1");
  const SHEET_ACTIVITIES = ss.getSheetByName("DB_Activities");
  const SHEET_ROSTER = ss.getSheetByName("DB_Roster");
  const SHEET_DEST = ss.getSheetByName("DB_Attendance");

  // --- 1. CONFIGURATION: COLUMN INDEXES (0-based) ---
  
  // STAGING SHEET (Form Responses 1)
  const COL_FORM_ACTIVITY_KEY = 2;  // Col C: Select Event
  
  // Patrol Columns (E through I)
  const COL_SCOUTS_START = 4;       // Col E (Fearless Foxes)
  const COL_SCOUTS_END = 8;         // Col I (Wolf Warriors)
  
  const COL_FORM_MISSED = 9;        // Col J: Missed Scouts?
  
  // Admin Columns (Assuming K onwards)
  const COL_STATUS = 10;            // Col K: Admin Status
  const COL_OVER_NIGHTS = 11;       // Col L
  const COL_OVER_MILES = 12;        // Col M
  const COL_OVER_SERVICE = 13;      // Col N

  // DB_ACTIVITIES (Verified from your CSV)
  // Headers: Event_ID, Date, Activity, Type, Status, Nights, Service_Hours, Miles
  const ACT_COL_MATCH_KEY = 0;      // Col A: Event_ID
  const ACT_COL_SAVE_ID = 0;        // Col A: Event_ID
  const ACT_COL_DATE = 1;           // Col B: Date (Was wrong before!)
  const ACT_COL_NIGHTS = 5;         // Col F: Nights
  const ACT_COL_SERVICE = 6;        // Col G: Service_Hours
  const ACT_COL_MILES = 7;          // Col H: Miles

  // DB_ROSTER (Verified from your CSV)
  // Headers: Full_Name, Scout_ID, Patrol_ID...
  const ROSTER_COL_MATCH_KEY = 0;   // Col A: Full_Name
  const ROSTER_COL_NAME_TO_SAVE = 0; // Col A: Full_Name
  const ROSTER_COL_ID = 1;          // Col B: Scout_ID

  // --- LOAD MAPS ---
  const activityMap = loadActivityMap(SHEET_ACTIVITIES, ACT_COL_MATCH_KEY, ACT_COL_SAVE_ID, ACT_COL_DATE, ACT_COL_NIGHTS, ACT_COL_SERVICE, ACT_COL_MILES);
  const scoutMap = loadScoutMap(SHEET_ROSTER, ROSTER_COL_ID, ROSTER_COL_MATCH_KEY, ROSTER_COL_NAME_TO_SAVE);

  // --- PROCESS STAGING ---
  const stagingData = SHEET_STAGING.getDataRange().getValues();
  const destRows = [];
  const rowsToMarkPosted = []; 

  console.log(`Processing ${stagingData.length - 1} rows...`);

  // Loop Staging (Start i=1)
  for (let i = 1; i < stagingData.length; i++) {
    const row = stagingData[i];
    
    // Check Status
    if (row[COL_STATUS] === "Posted") continue;

    // 1. GET NAMES (The "Posted" Bug Fix)
    let rawNames = "";
    for (let c = COL_SCOUTS_START; c <= COL_SCOUTS_END; c++) {
      if (row[c]) rawNames += row[c] + ",";
    }
    if (row[COL_FORM_MISSED]) rawNames += row[COL_FORM_MISSED];

    if (!row[COL_FORM_ACTIVITY_KEY] && !rawNames) continue;

    // 2. LOOKUP ACTIVITY
    const lookupKey = row[COL_FORM_ACTIVITY_KEY] ? row[COL_FORM_ACTIVITY_KEY].toString().trim() : "";
    const actData = activityMap[lookupKey];

    if (!actData) {
      console.error(`Row ${i+1}: FAILED. Activity Key '${lookupKey}' not found.`);
      continue; 
    }

    // 3. CLEAN NAMES (Filter out "Posted")
    const names = rawNames.split(",")
      .map(s => s.trim())
      .filter(s => s !== "" && s !== "Posted"); // <--- FIX FOR PHANTOM SCOUT

    // 4. MATCH & PUSH
    names.forEach(name => {
      const scoutData = scoutMap[name];
      if (scoutData) {
        destRows.push([
          actData.id,        // Col A: Event_ID
          actData.date,      // Col B: Date
          scoutData.name,    // Col C: Scout Name
          scoutData.id,      // Col D: Scout ID
          // Check for overrides, else use defaults
          (row[COL_OVER_NIGHTS] !== "") ? row[COL_OVER_NIGHTS] : actData.nights,
          (row[COL_OVER_MILES] !== "") ? row[COL_OVER_MILES] : actData.miles,
          (row[COL_OVER_SERVICE] !== "") ? row[COL_OVER_SERVICE] : actData.service
        ]);
      } else {
        console.warn(`Row ${i+1}: Scout '${name}' not found in Roster.`);
      }
    });

    rowsToMarkPosted.push(i + 1);
  }

  // --- WRITE ---
  if (destRows.length > 0) {
    SHEET_DEST.getRange(SHEET_DEST.getLastRow() + 1, 1, destRows.length, destRows[0].length).setValues(destRows);
    
    rowsToMarkPosted.forEach(rowIndex => {
      SHEET_STAGING.getRange(rowIndex, COL_STATUS + 1).setValue("Posted");
    });
    SpreadsheetApp.getUi().alert(`Processed ${rowsToMarkPosted.length} staging rows.`);
  } else {
    SpreadsheetApp.getUi().alert("No valid pending rows found.");
  }
}

// --- HELPER FUNCTIONS ---
function loadActivityMap(sheet, colKey, colSaveID, colDate, colNights, colService, colMiles) {
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const key = row[colKey]; 
    if (key) {
      map[key.toString().trim()] = {
        id: row[colSaveID],
        date: row[colDate], // This will now grab Column B (Date) correctly
        nights: row[colNights] || 0,
        service: row[colService] || 0,
        miles: row[colMiles] || 0
      };
    }
  }
  return map;
}

function loadScoutMap(sheet, colID, colMatchKey, colSaveName) {
  const data = sheet.getDataRange().getValues();
  const map = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    // Check if row has enough columns
    if (row.length > Math.max(colID, colMatchKey)) {
      const nameKey = row[colMatchKey];
      const id = row[colID];
      
      if (nameKey) {
        map[nameKey.toString().trim()] = { 
          id: id,            // This grabs Column B (Scout ID)
          name: row[colSaveName] // This grabs Column A (Full Name)
        };
      }
    }
  }
  return map;
}

function diagnoseStaging() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Form Responses 1");
  const data = sheet.getDataRange().getValues();

  // We look at Row 2 (Index 1) which is the first real response
  const row = data[1]; 

  if (!row) {
    console.log("ERROR: Staging sheet appears to be empty.");
    return;
  }

  console.log("--- DIAGNOSTIC REPORT (Row 2) ---");
  console.log(`Col A [0] (Timestamp): ${row[0]}`);
  console.log(`Col B [1] (Email?):    ${row[1]}`);
  console.log(`Col C [2] (Activity?): ${row[2]}`);
  console.log(`Col D [3] (Patrol?):   ${row[3]}`);
  console.log(`Col E [4] (Scouts?):   ${row[4]}`);
  console.log(`Col F [5] (Missed?):   ${row[5]}`);
  console.log(`Col G [6] (Notes?):    ${row[6]}`);
  console.log(`Col H [7] (Status?):   ${row[7]}`);
  
  console.log("--- KEY CHECK ---");
  console.log(`Script expects Activity Key in Col C [2]. Found: '${row[2]}'`);
  console.log(`Script expects Status in Col H [7]. Found: '${row[7]}'`);
}

