/**
 * Gets the active spreadsheet and the definition/log sheets.
 * @returns {object|null} An object containing the spreadsheet, definition sheet, and log sheet, or null on error.
 */
function getSheets() {
  try { // Add try-catch for robustness
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const defSheet = ss.getSheetByName("WorkoutDefinitions");
    const logSheet = ss.getSheetByName("WorkoutLog");

    if (!defSheet) {
      Logger.log("Error: 'WorkoutDefinitions' sheet not found!");
      // REMOVED: SpreadsheetApp.getUi().alert("Error: 'WorkoutDefinitions' sheet not found!");
      throw new Error("'WorkoutDefinitions' sheet not found!"); // Throw error instead of alert
    }
    if (!logSheet) {
      Logger.log("Error: 'WorkoutLog' sheet not found!");
      // REMOVED: SpreadsheetApp.getUi().alert("Error: 'WorkoutLog' sheet not found!");
      throw new Error("'WorkoutLog' sheet not found!"); // Throw error instead of alert
    }
    return { ss, defSheet, logSheet };
  } catch (error) {
    Logger.log(`Error in getSheets: ${error.message}`);
    return null; // Return null to indicate failure
  }
}

/**
 * Determines the workout letter (A, B, C) based on the day of the week.
 * Monday = A, Wednesday = B, Friday = C.
 * @returns {string|null} The workout letter or null if it's not a workout day.
 */
function getWorkoutLetterForToday() {
  const today = new Date();
  const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

  switch (dayOfWeek) {
    case 1: // Monday
      return "A";
    case 3: // Wednesday
      return "B";
    case 5: // Friday
      return "C";
    default:
      return null; // Not a designated workout day
  }
}


/**
 * Adds custom menus to the spreadsheet UI.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Workout Helper')
    // .addItem('Show Today\'s Workout', 'displayTodaysWorkout') // REMOVE THIS LINE
    .addItem('Show Workout/Log Sidebar', 'showLogSidebar') // Maybe rename this item?
    .addToUi();
}