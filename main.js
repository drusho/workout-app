// /**
//  * Gets the active spreadsheet and the definition/log sheets.
//  * @returns {object|null} An object containing the spreadsheet, definition sheet, and log sheet, or null on error.
//  */
// function getSheets() {
//   try { // Add try-catch for robustness
//     const ss = SpreadsheetApp.getActiveSpreadsheet();
//     const defSheet = ss.getSheetByName("WorkoutDefinitions");
//     const logSheet = ss.getSheetByName("WorkoutLog");

//     if (!defSheet) {
//       Logger.log("Error: 'WorkoutDefinitions' sheet not found!");
//       // REMOVED: SpreadsheetApp.getUi().alert("Error: 'WorkoutDefinitions' sheet not found!");
//       throw new Error("'WorkoutDefinitions' sheet not found!"); // Throw error instead of alert
//     }
//     if (!logSheet) {
//       Logger.log("Error: 'WorkoutLog' sheet not found!");
//       // REMOVED: SpreadsheetApp.getUi().alert("Error: 'WorkoutLog' sheet not found!");
//       throw new Error("'WorkoutLog' sheet not found!"); // Throw error instead of alert
//     }
//     return { ss, defSheet, logSheet };
//   } catch (error) {
//     Logger.log(`Error in getSheets: ${error.message}`);
//     return null; // Return null to indicate failure
//   }
// }

// /**
//  * Determines the workout letter (A, B, C) based on the day of the week.
//  * Monday = A, Wednesday = B, Friday = C.
//  * @returns {string|null} The workout letter or null if it's not a workout day.
//  */
// function getWorkoutLetterForToday() {
//   const today = new Date();
//   const dayOfWeek = today.getDay(); // Sunday = 0, Monday = 1, ..., Saturday = 6

//   switch (dayOfWeek) {
//     case 1: // Monday
//       return "A";
//     case 3: // Wednesday
//       return "B";
//     case 5: // Friday
//       return "C";
//     default:
//       return null; // Not a designated workout day
//   }
// }


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

function doGet(e) {
  // Create the HTML template from the file we already have
  const htmlTemplate = HtmlService.createTemplateFromFile('LogExercise');

  // Evaluate the template to get the final HTML output
  const htmlOutput = htmlTemplate.evaluate()
    .setTitle('Workout Logger') // Sets browser tab title
    .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // Helps with mobile scaling

  // Optional: Set XFrame options if embedding elsewhere, usually not needed for direct access
  // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

  return htmlOutput;
}

/**
 * Gets the active spreadsheet and the definition/log sheets.
 * @returns {object|null} An object containing the spreadsheet, definition sheet, and log sheet, or null on error.
 */
function getSheets() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const defSheet = ss.getSheetByName("WorkoutDefinitions");
    const logSheet = ss.getSheetByName("WorkoutLog");

    if (!defSheet) {
      Logger.log("Error: 'WorkoutDefinitions' sheet not found!");
      throw new Error("'WorkoutDefinitions' sheet not found!");
    }
    if (!logSheet) {
      Logger.log("Error: 'WorkoutLog' sheet not found!");
      throw new Error("'WorkoutLog' sheet not found!");
    }
    return { ss, defSheet, logSheet };
  } catch (error) {
    Logger.log(`Error in getSheets: ${error.message}`);
    return null; // Return null to indicate failure
  }
}


/**
 * Helper function to find the row index for a specific exercise.
 * @param {Sheet} sheet The sheet to search within (e.g., WorkoutDefinitions).
 * @param {string} exerciseName The name of the exercise to find.
 * @param {number} columnNameIndex The 0-based index of the column containing exercise names.
 * @returns {number} The 1-based row index of the exercise, or -1 if not found.
 */
function findExerciseRowIndex(sheet, exerciseName, columnNameIndex) {
  if (columnNameIndex === undefined || columnNameIndex < 0) {
    Logger.log("Error in findExerciseRowIndex: Invalid columnNameIndex provided.");
    return -1;
  }
  const data = sheet.getDataRange().getValues();
  // Start from row 1 to skip header
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnNameIndex] && data[i][columnNameIndex].toString().trim().toLowerCase() === exerciseName.trim().toLowerCase()) {
      return i + 1; // Return 1-based index for sheet range methods
    }
  }
  return -1; // Not found
}


/**
 * Logs a completed exercise to the WorkoutLog sheet and triggers progression update.
 * (Removed UI elements like alerts and toasts for Web App compatibility)
 * @param {string} exerciseName The name of the exercise performed.
 * @param {number} setsPerformed Actual sets completed.
 * @param {number} repsPerformed Actual reps completed (e.g., on the last set or target achieved).
 * @param {number} weightUsed The weight used for the exercise.
 * @param {number} rpe The Rate of Perceived Exertion (1-10) recorded for the exercise.
 * @param {string} [workoutLetterOverride] Optional: The specific workout letter being logged (e.g., from form).
 * @throws {Error} Throws error if logging fails or progression fails.
 */
function logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetterOverride = null) {
  const sheets = getSheets();
  if (!sheets) {
    Logger.log("logExercise failed: Could not get sheets.");
    throw new Error("Failed to access spreadsheet sheets.");
  }

  const timestamp = new Date();
  // Determine workout letter - Use override if provided, otherwise null as day doesn't matter now
  const workoutLetter = workoutLetterOverride || null; // Day based letter maybe not relevant anymore? Set explicitly.

  try {
    // Append to WorkoutLog sheet
    sheets.logSheet.appendRow([
      timestamp,
      workoutLetter || "N/A", // Log the letter passed from the form
      exerciseName,
      setsPerformed,
      repsPerformed,
      weightUsed,
      rpe
    ]);
    Logger.log(`Logged: ${exerciseName} for Workout ${workoutLetter}, Sets: ${setsPerformed}, Reps: ${repsPerformed}, Weight: ${weightUsed}, RPE: ${rpe}`);

    // Trigger the cycle progression update
    updateCycleProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe);

  } catch (error) {
    Logger.log(`Error during logExercise for ${exerciseName}: ${error.message}`);
    throw new Error(`Failed to log or update progression for ${exerciseName}: ${error.message}`);
  }
}


/**
 * Updates the cycle step and weight for the next workout based on RPE.
 * Assumes progression type is 'Cycle'. Handles other types by returning.
 */
function updateCycleProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe) {
  const sheets = getSheets();
  if (!sheets) return; // Error handled in getSheets

  Logger.log(`--- Starting Cycle Progression Check for: ${exerciseName} ---`);
  Logger.log(`Logged RPE: ${rpe}, Weight Used: ${weightUsed}`);

  try {
    const defData = sheets.defSheet.getDataRange().getValues();
    const headers = defData[0];
    const headerMap = {};
    headers.forEach((header, index) => { headerMap[header.trim()] = index; });

    // *** DEFINE REQUIRED HEADERS FOR THIS FUNCTION ***
    const requiredHeaders = [
      "Exercise Name", "Current Cycle Step", "Cycle Base Weight",
      "Current Weight", "Target Reps Min", "Progression Type"
    ];
    // Validate headers exist
    for (const header of requiredHeaders) {
      if (headerMap[header] === undefined) {
        const errorMsg = `Error: Missing required header column '${header}' in WorkoutDefinitions sheet.`;
        Logger.log(errorMsg);
        throw new Error(errorMsg);
      }
    }
    // *** END HEADER DEFINITION ***

    const rowIndex = findExerciseRowIndex(sheets.defSheet, exerciseName, headerMap["Exercise Name"]);
    if (rowIndex === -1) throw new Error(`Exercise ${exerciseName} not found.`);

    const exerciseData = defData[rowIndex - 1];
    const progressionType = exerciseData[headerMap["Progression Type"]].toString().toLowerCase();

    if (progressionType !== 'cycle') {
      Logger.log(`Skipping cycle progression for ${exerciseName} (Type: ${progressionType}).`);
      return;
    }

    // --- Read current state ---
    const currentCycleStep = parseInt(exerciseData[headerMap["Current Cycle Step"]]);
    const cycleBaseWeight = parseFloat(exerciseData[headerMap["Cycle Base Weight"]]);
    const completedWeight = weightUsed; // Use weight from the workout just done
    const minReps = parseInt(exerciseData[headerMap["Target Reps Min"]]);

    Logger.log(`Current State: Step=${currentCycleStep}, BaseW=${cycleBaseWeight}, CompletedW=${completedWeight}, MinReps=${minReps}`);

    if (isNaN(currentCycleStep) || isNaN(cycleBaseWeight) || isNaN(completedWeight) || isNaN(minReps)) {
      throw new Error(`Invalid number format found in sheet for ${exerciseName}.`);
    }

    // --- Determine Next Step ---
    let nextCycleStep = currentCycleStep;
    let nextWeight = completedWeight;
    let nextBaseWeight = cycleBaseWeight;
    let progressionApplied = false;

    if (rpe <= 8) {
      nextCycleStep = currentCycleStep + 1;
      progressionApplied = true;
      Logger.log(`RPE <= 8. Progressing from step ${currentCycleStep} to ${nextCycleStep}.`);
    } else {
      nextCycleStep = currentCycleStep; // Repeat
      progressionApplied = false;
      Logger.log(`RPE > 8. Repeating step ${currentCycleStep}.`);
    }

    // --- Calculate Specific Parameters for the NEXT Workout ---
    let calculatedNextSets = 0; // For logging/display only
    let calculatedNextReps = ""; // For logging/display only

    switch (nextCycleStep) {
      case 1: calculatedNextSets = 3; calculatedNextReps = minReps; nextWeight = nextBaseWeight; break;
      case 2: calculatedNextSets = 4; calculatedNextReps = minReps; nextWeight = nextBaseWeight; break;
      case 3: calculatedNextSets = 3; calculatedNextReps = minReps; nextWeight = nextBaseWeight + 5; break;
      case 4: calculatedNextSets = 4; calculatedNextReps = minReps; nextWeight = nextBaseWeight + 5; break;
      case 5: calculatedNextSets = 3; calculatedNextReps = minReps + 2; nextWeight = nextBaseWeight + 5; break;
      case 6: calculatedNextSets = 4; calculatedNextReps = minReps + 2; nextWeight = nextBaseWeight + 5; break;
      case 7: calculatedNextSets = 3; calculatedNextReps = minReps + 2; nextWeight = nextBaseWeight + 10; break;
      case 8: // AMRAP Prep
        calculatedNextSets = 1; calculatedNextReps = "AMRAP";
        if (currentCycleStep === 7 && progressionApplied) {
          nextWeight = (completedWeight / 0.82) * 0.90;
          nextWeight = Math.round(nextWeight / 2.5) * 2.5;
          Logger.log(`Calculated AMRAP weight for Step 8: ${nextWeight} (based on W7 weight ${completedWeight})`);
        } else {
          nextWeight = completedWeight;
          Logger.log(`Repeating Step 8 or invalid previous step. Using weight: ${nextWeight}`);
        }
        break;
      case 9: // Cycle Reset
        Logger.log(`Cycle complete. Resetting to Step 1.`);
        nextCycleStep = 1;
        nextBaseWeight = cycleBaseWeight + 15; // Old Base + 15lbs (simple reset)
        Logger.log(`Resetting Base Weight for new cycle to: ${nextBaseWeight}`);
        calculatedNextSets = 3; calculatedNextReps = minReps;
        nextWeight = nextBaseWeight;
        break;
      default:
        Logger.log(`ERROR: Invalid nextCycleStep calculated: ${nextCycleStep}`);
        throw new Error(`Invalid next cycle step calculated for ${exerciseName}`);
    }

    // --- Update Sheet ---
    Logger.log(`Updating Sheet: Row=${rowIndex}, Next Step=${nextCycleStep}, Next Weight=${nextWeight}, Next Base Weight=${nextBaseWeight}`);
    sheets.defSheet.getRange(rowIndex, headerMap["Current Cycle Step"] + 1).setValue(nextCycleStep);
    sheets.defSheet.getRange(rowIndex, headerMap["Current Weight"] + 1).setValue(nextWeight);
    if (nextBaseWeight !== cycleBaseWeight) {
      sheets.defSheet.getRange(rowIndex, headerMap["Cycle Base Weight"] + 1).setValue(nextBaseWeight);
    }

    Logger.log(`--- Finished Cycle Progression Check for: ${exerciseName} ---`);

  } catch (error) {
    Logger.log(`!!! ERROR in updateCycleProgression for ${exerciseName}: ${error.message}`);
    Logger.log(`Stack: ${error.stack ? error.stack : 'N/A'}`);
    throw new Error(`Cycle progression failed for ${exerciseName}: ${error.message}`);
  }
}


/**
 * Processes the form data submitted from the web app.
 * This function is called by google.script.run from the client-side JS.
 */
function processLogForm(formData) {
  Logger.log(`--- processLogForm: Started ---`);
  Logger.log(`processLogForm: Received formData: ${JSON.stringify(formData)}`);
  try {
    // --- Validation ---
    Logger.log(`processLogForm: Validating data...`);
    const workoutLetter = formData.workoutLetter;
    const exerciseName = formData.exerciseName;
    if (!formData.setsPerformed || !formData.repsPerformed || !formData.weightUsed || !formData.rpe) {
      throw new Error("Missing required form data fields (sets, reps, weight, or rpe).");
    }
    const setsPerformed = parseInt(formData.setsPerformed);
    const repsPerformed = parseInt(formData.repsPerformed);
    const weightUsed = parseFloat(formData.weightUsed);
    const rpe = parseInt(formData.rpe);

    if (!workoutLetter || !['A', 'B', 'C'].includes(workoutLetter.toUpperCase())) throw new Error("Workout Letter missing/invalid.");
    if (!exerciseName) throw new Error("Exercise name missing.");
    if (isNaN(setsPerformed) || setsPerformed <= 0) throw new Error("Invalid 'Sets Performed'.");
    if (isNaN(repsPerformed) || repsPerformed <= 0) throw new Error("Invalid 'Reps Performed'."); // Allow 0 reps? Maybe >= 0
    if (isNaN(weightUsed) || weightUsed < 0) throw new Error("Invalid 'Weight Used'.");
    if (isNaN(rpe) || rpe < 1 || rpe > 10) throw new Error("Invalid 'RPE'.");
    Logger.log(`processLogForm: Validation complete. Data: L=${workoutLetter}, Ex=${exerciseName}, S=${setsPerformed}, R=${repsPerformed}, W=${weightUsed}, RPE=${rpe}`);

    // --- Call logExercise ---
    Logger.log(`processLogForm: Calling logExercise...`);
    logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetter);
    Logger.log(`processLogForm: logExercise call completed.`);

    // --- Prepare Return Object ---
    // (Not including updatedWorkoutDetails as per user request)
    const returnData = {
      message: `${exerciseName} logged successfully for Workout ${workoutLetter}!`,
      loggedData: {
        name: exerciseName,
        sets: setsPerformed,
        reps: repsPerformed,
        weight: weightUsed,
        rpe: rpe
      }
    };
    Logger.log(`processLogForm: Prepared return data: ${JSON.stringify(returnData)}`);
    Logger.log(`--- processLogForm: Finished Successfully ---`);
    return returnData;

  } catch (error) {
    Logger.log(`!!! ERROR in processLogForm: ${error.message}`);
    Logger.log(`processLogForm Error Stack: ${error.stack ? error.stack : 'No stack trace'}`);
    Logger.log(`--- processLogForm: Finished with ERROR ---`);
    throw new Error(`Failed to process log: ${error.message}`);
  }
}
// *** REMOVED DUPLICATE processLogForm definition ***


/**
 * Gets the details (name, sets, reps, weight) for exercises of a specific workout letter
 * based on the new cycle progression logic.
 */
function getWorkoutDetails(letter) {
  Logger.log(`--- getWorkoutDetails: Started for letter ${letter} ---`);
  const requiredHeaders = [ // Headers needed by this function
    "Workout Letter", "Exercise Name", "Target Reps Min", "Current Weight",
    "Cycle Base Weight", "Current Cycle Step", "Progression Type",
    "Target Sets Min" // <<< Keep if 'Failure' type is used
  ];

  if (!letter || !['A', 'B', 'C'].includes(letter.toUpperCase())) {
    throw new Error("Invalid workout letter provided.");
  }

  const sheets = getSheets();
  if (!sheets) {
    throw new Error("Could not access spreadsheet sheets.");
  }

  const dataRange = sheets.defSheet.getDataRange();
  const values = dataRange.getValues();
  const headers = values[0];
  const headerMap = {};
  headers.forEach((header, index) => { headerMap[header.trim()] = index; });

  // Validate required headers are present
  for (const header of requiredHeaders) {
    // Allow Target Sets Min to be optional if Failure type isn't used
    if (header === "Target Sets Min" && headerMap[header] === undefined) {
      Logger.log("Optional header 'Target Sets Min' not found, assuming not needed for Failure type.");
      continue; // Skip if not found, handle potential error later if needed
    }
    if (headerMap[header] === undefined) {
      const errorMsg = `Error: Missing required header column '${header}' in WorkoutDefinitions sheet.`;
      Logger.log(errorMsg);
      throw new Error(errorMsg);
    }
  }

  const workoutDetails = [];
  // Get indices needed within the loop (check if they exist)
  const letterColIndex = headerMap["Workout Letter"];
  const nameColIndex = headerMap["Exercise Name"];
  const currentWeightColIndex = headerMap["Current Weight"]; // Weight scheduled for the next workout
  const cycleStepColIndex = headerMap["Current Cycle Step"];
  const baseWeightColIndex = headerMap["Cycle Base Weight"];
  const minRepColIndex = headerMap["Target Reps Min"];
  const progTypeColIndex = headerMap["Progression Type"];
  const targetSetsMinColIndex = headerMap["Target Sets Min"]; // Might be undefined

  // Start from row 1 to skip header
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    // Check if row has enough columns and the workout letter matches
    if (row.length > letterColIndex && row[letterColIndex] && row[letterColIndex].toString().toUpperCase() === letter.toUpperCase()) {
      const exerciseName = row[nameColIndex];
      const progType = row[progTypeColIndex] ? row[progTypeColIndex].toString().toLowerCase() : 'unknown';
      const nextWorkoutWeight = parseFloat(row[currentWeightColIndex]); // Use the weight already set for the next workout
      let targetSets = "-";
      let targetReps = "-";

      if (progType === 'cycle' && cycleStepColIndex !== undefined && minRepColIndex !== undefined) {
        const cycleStep = parseInt(row[cycleStepColIndex]);
        const minReps = parseInt(row[minRepColIndex]);
        if (!isNaN(cycleStep) && !isNaN(minReps)) {
          // Calculate sets/reps based on the upcoming cycle step stored in the sheet
          switch (cycleStep) {
            case 1: targetSets = 3; targetReps = minReps; break;
            case 2: targetSets = 4; targetReps = minReps; break;
            case 3: targetSets = 3; targetReps = minReps; break;
            case 4: targetSets = 4; targetReps = minReps; break;
            case 5: targetSets = 3; targetReps = minReps + 2; break;
            case 6: targetSets = 4; targetReps = minReps + 2; break;
            case 7: targetSets = 3; targetReps = minReps + 2; break;
            case 8: targetSets = 1; targetReps = "AMRAP"; break;
            default: Logger.log(`Invalid cycle step ${cycleStep} found in sheet for ${exerciseName}`); break;
          }
        } else {
          Logger.log(`Could not parse cycleStep or minReps for ${exerciseName}`);
        }
      } else if (progType === 'failure' && targetSetsMinColIndex !== undefined) {
        const sets = parseInt(row[targetSetsMinColIndex]);
        targetSets = isNaN(sets) ? "-" : sets;
        targetReps = "Failure";
      } else {
        Logger.log(`Unknown or unhandled progression type '${progType}' or missing columns for ${exerciseName}`);
      }

      workoutDetails.push({
        name: exerciseName || "[No Name]",
        sets: targetSets,
        reps: targetReps,
        weight: isNaN(nextWorkoutWeight) ? "-" : nextWorkoutWeight // Display the pre-calculated weight for the next workout
      });
    }
  }
  Logger.log(`Found details for workout ${letter}: ${JSON.stringify(workoutDetails)}`);
  Logger.log(`--- getWorkoutDetails: Finished for letter ${letter} ---`);
  return workoutDetails;
}