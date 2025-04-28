/**
 * Helper function to find the row index for a specific exercise.
 * @param {Sheet} sheet The sheet to search within (e.g., WorkoutDefinitions).
 * @param {string} exerciseName The name of the exercise to find.
 * @param {number} columnNameIndex The 0-based index of the column containing exercise names.
 * @returns {number} The 1-based row index of the exercise, or -1 if not found.
 */
function findExerciseRowIndex(sheet, exerciseName, columnNameIndex) {
  const data = sheet.getDataRange().getValues();
  // Start from row 1 to skip header
  for (let i = 1; i < data.length; i++) {
    if (data[i][columnNameIndex].toString().trim().toLowerCase() === exerciseName.trim().toLowerCase()) {
      return i + 1; // Return 1-based index for sheet range methods
    }
  }
  return -1; // Not found
}


/**
 * Logs a completed exercise to the WorkoutLog sheet and triggers progression update.
 * @param {string} exerciseName The name of the exercise performed.
 * @param {number} setsPerformed Actual sets completed.
 * @param {number} repsPerformed Actual reps completed (e.g., on the last set or target achieved).
 * @param {number} weightUsed The weight used for the exercise.
 * @param {number} rpe The Rate of Perceived Exertion (1-10) recorded for the exercise.
 */
function logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe) {
  const sheets = getSheets();
  if (!sheets) return;

  const timestamp = new Date();
  const workoutLetter = getWorkoutLetterForToday(); // Or potentially get from the context where it's called

  if (!exerciseName || setsPerformed == null || repsPerformed == null || weightUsed == null || rpe == null) {
    SpreadsheetApp.getUi().alert("Error logging exercise: Missing one or more values.");
    return;
  }
  if (isNaN(setsPerformed) || isNaN(repsPerformed) || isNaN(weightUsed) || isNaN(rpe)) {
    SpreadsheetApp.getUi().alert("Error logging exercise: Sets, Reps, Weight, and RPE must be numbers.");
    return;
  }

  try {
    // Append to WorkoutLog sheet
    sheets.logSheet.appendRow([
      timestamp,
      workoutLetter || "N/A", // Handle case where it might be logged on a non-workout day
      exerciseName,
      setsPerformed,
      repsPerformed,
      weightUsed,
      rpe
    ]);
    Logger.log(`Logged: ${exerciseName}, Sets: ${setsPerformed}, Reps: ${repsPerformed}, Weight: ${weightUsed}, RPE: ${rpe}`);

    // Trigger the progression update for the *next* workout
    updateProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe);

    SpreadsheetApp.getActiveSpreadsheet().toast(`Logged ${exerciseName} successfully!`);

  } catch (error) {
    Logger.log(`Error in logExercise: ${error}`);
    SpreadsheetApp.getUi().alert(`Failed to log exercise: ${error}`);
  }
}


/**
 * Updates the target sets, reps, or weight for the next workout based on RPE.
 * (Removed UI elements like alerts and toasts for Web App compatibility)
 * @param {string} exerciseName The name of the exercise performed.
 * @param {number} setsPerformed Actual sets completed in the logged workout.
 * @param {number} repsPerformed Actual reps completed in the logged workout.
 * @param {number} weightUsed The weight used for the logged workout.
 * @param {number} rpe The RPE recorded for the logged workout.
 * @throws {Error} Throws error if update logic fails.
 */
function updateProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe) {
  const sheets = getSheets();
  if (!sheets) {
    Logger.log("updateProgression failed: Could not get sheets.");
    throw new Error("Failed to access spreadsheet sheets."); // Propagate error
  }

  // REMOVED: const ui = SpreadsheetApp.getUi(); // No longer needed
  let didProgress = false;
  let progressMessage = `Progression for ${exerciseName}: `;

  try {
    // ... (reading data, header mapping, finding row index - keep these) ...
    const defData = sheets.defSheet.getDataRange().getValues();
    const headers = defData[0];
    const headerMap = {};
    headers.forEach((header, index) => { headerMap[header.trim()] = index; });

    const requiredHeaders = [/* ... headers ... */]; // Keep header check
    for (const header of requiredHeaders) {
      if (headerMap[header] === undefined) {
        const errorMsg = `Error: Missing required header column '${header}' in WorkoutDefinitions sheet.`;
        Logger.log(errorMsg);
        throw new Error(errorMsg); // Throw error instead of alert
      }
    }
    const exerciseNameColIndex = headerMap["Exercise Name"];
    const rowIndex = findExerciseRowIndex(sheets.defSheet, exerciseName, exerciseNameColIndex);
    if (rowIndex === -1) {
      Logger.log(`Progression Error: Exercise "${exerciseName}" not found in WorkoutDefinitions.`);
      throw new Error(`Exercise "${exerciseName}" not found.`); // Throw error
    }
    // ... (parsing values like targetSetsMin, currentTargetSets, etc. - keep these, including the NaN checks and detailed logging) ...
    const exerciseData = defData[rowIndex - 1];
    const progressionType = exerciseData[headerMap["Progression Type"]].toString().trim();
    // ... parse other values ...
    let currentWeight = parseFloat(exerciseData[headerMap["Current Weight"]]);
    let currentTargetSets = parseInt(exerciseData[headerMap["Current Target Sets"]]);
    let currentTargetReps = parseInt(exerciseData[headerMap["Current Target Reps"]]);
    // ... keep detailed logging and NaN checks ...


    // --- Progression Logic --- (Keep the core if/else if/else structure)
    if (progressionType.toLowerCase() === "standard" && rpe <= 8) {
      // ... (Keep the logic for increasing reps/sets/weight) ...
      // ... (Keep the Logger.log calls inside these blocks) ...
      // ... (Keep the sheets.defSheet.getRange().setValue() calls) ...
      didProgress = true; // Make sure this is set correctly in each block
    } else if (progressionType.toLowerCase() === "failure") {
      Logger.log(`Skipping RPE-based progression for ${exerciseName} (Type: Failure).`);
      progressMessage += `No progression (Type: Failure).`;
    } else if (rpe > 8) {
      Logger.log(`No progression for ${exerciseName} (RPE ${rpe} > 8).`);
      progressMessage += `No progression (RPE > 8).`;
    } else {
      Logger.log(`Skipping RPE-based progression for ${exerciseName} (Type: ${progressionType}).`);
      progressMessage += `No progression (Type: ${progressionType}).`;
    }

    // --- Log Summary ---
    Logger.log(`--- Finished Progression Debug for: ${exerciseName}. Progress applied: ${didProgress} ---`);

    // REMOVED: Toast messages like SpreadsheetApp.getActiveSpreadsheet().toast(...)

  } catch (error) {
    Logger.log(`ERROR during updateProgression for ${exerciseName}: ${error.message}`);
    Logger.log(`Error stack: ${error.stack}`);
    // Rethrow the error so logExercise/processLogForm catches it
    throw new Error(`Progression update failed for ${exerciseName}: ${error.message}`);
  }
}


/**
 * Creates and shows the log exercise sidebar.
 * The sidebar will initially prompt user to select workout letter.
 */
function showLogSidebar() {
  // Create HTML template from the file - No need to pass exercises initially
  const htmlTemplate = HtmlService.createTemplateFromFile('LogExerciseSidebar');

  // We are NOT passing exerciseOptions here anymore.
  // The sidebar's JS will call getExercisesForWorkoutLetter() itself.

  // Evaluate the template to get the final HTML output
  const htmlOutput = htmlTemplate.evaluate()
    .setTitle('Log Exercise')
    .setWidth(320); // Adjusted width slightly

  SpreadsheetApp.getUi().showSidebar(htmlOutput);
}


/**
 * Processes the form data submitted from the sidebar.
 * This function is called by google.script.run from the sidebar's JS.
 * @param {object} formData The data object sent from the sidebar form, INCLUDING workoutLetter.
 * @returns {string} A success message to be shown in the sidebar.
 * @throws {Error} An error message if validation fails or logging fails.
 */
function processLogForm(formData) {
  try {
    // --- Get the workout letter from the form data ---
    const workoutLetter = formData.workoutLetter;
    const exerciseName = formData.exerciseName;
    const setsPerformed = parseInt(formData.setsPerformed);
    const repsPerformed = parseInt(formData.repsPerformed);
    const weightUsed = parseFloat(formData.weightUsed);
    const rpe = parseInt(formData.rpe);

    // --- Validation ---
    if (!workoutLetter || !['A', 'B', 'C'].includes(workoutLetter.toUpperCase())) {
      throw new Error("Workout Letter is missing or invalid.");
    }
    if (!exerciseName) {
      throw new Error("Exercise name is missing.");
    }
    // (Keep other existing validations for sets, reps, weight, rpe)
    if (isNaN(setsPerformed) || setsPerformed <= 0) throw new Error("Invalid 'Sets Performed'. Must be a positive number.");
    if (isNaN(repsPerformed) || repsPerformed <= 0) throw new Error("Invalid 'Reps Performed'. Must be a positive number.");
    if (isNaN(weightUsed) || weightUsed < 0) throw new Error("Invalid 'Weight Used'. Must be a non-negative number.");
    if (isNaN(rpe) || rpe < 1 || rpe > 10) throw new Error("Invalid 'RPE'. Must be a number between 1 and 10.");


    // Call the modified logExercise function, passing the letter from the form
    logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetter); // Pass workoutLetter here

    return {
      message: `${exerciseName} logged successfully for Workout ${workoutLetter}!`,
      loggedData: { // Construct the object to return
        name: exerciseName,
        sets: setsPerformed,
        reps: repsPerformed,
        weight: weightUsed,
        rpe: rpe
      }
    };

  } catch (error) {
    Logger.log(`Error processing log form: ${error.message}`);
    throw new Error(`Failed to log: ${error.message}`);
  }
}


/**
 * Gets the details (name, sets, reps, weight) for exercises of a specific workout letter.
 * @param {string} letter The workout letter (A, B, or C).
 * @returns {Array<object>} A list of exercise detail objects, e.g.,
 * [{ name: "Ex1", sets: 2, reps: 5, weight: 100 }, ...].
 * @throws {Error} If letter is invalid or columns not found.
 */
function getWorkoutDetails(letter) {
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

  // Define required headers for fetching details
  const requiredHeaders = [
    "Workout Letter", "Exercise Name", "Current Target Sets",
    "Current Target Reps", "Current Weight"
  ];
  for (const header of requiredHeaders) {
    if (headerMap[header] === undefined) {
      const errorMsg = `Error: Missing required header column '${header}' in WorkoutDefinitions sheet.`;
      Logger.log(errorMsg);
      throw new Error(errorMsg);
    }
  }

  const workoutDetails = [];
  const letterColIndex = headerMap["Workout Letter"];
  const nameColIndex = headerMap["Exercise Name"];
  const setsColIndex = headerMap["Current Target Sets"];
  const repsColIndex = headerMap["Current Target Reps"];
  const weightColIndex = headerMap["Current Weight"];

  // Start from row 1 to skip header
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row[letterColIndex].toString().toUpperCase() === letter.toUpperCase()) {
      workoutDetails.push({
        name: row[nameColIndex],
        sets: row[setsColIndex],
        reps: row[repsColIndex],
        weight: row[weightColIndex]
      });
    }
  }
  Logger.log(`Found details for workout ${letter}: ${JSON.stringify(workoutDetails)}`);
  return workoutDetails;
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
  // Removed validation alerts - errors will be caught by processLogForm if inputs are bad
  // Logger calls remain for debugging

  const sheets = getSheets();
  // If getSheets threw an error, sheets will be null or the error bubbles up
  if (!sheets) {
    Logger.log("logExercise failed: Could not get sheets.");
    throw new Error("Failed to access spreadsheet sheets."); // Propagate error
  }

  const timestamp = new Date();
  const workoutLetter = workoutLetterOverride || getWorkoutLetterForToday(); // Determine letter

  // Main logic wrapped in try-catch
  try {
    // Append to WorkoutLog sheet
    sheets.logSheet.appendRow([
      timestamp,
      workoutLetter || "N/A", // Use the determined letter
      exerciseName,
      setsPerformed,
      repsPerformed,
      weightUsed,
      rpe
    ]);
    Logger.log(`Logged: ${exerciseName} for Workout ${workoutLetter}, Sets: ${setsPerformed}, Reps: ${repsPerformed}, Weight: ${weightUsed}, RPE: ${rpe}`);

    // Trigger the progression update for the *next* workout
    // This might throw an error if progression fails, which will be caught below
    updateProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe);

    // REMOVED: SpreadsheetApp.getActiveSpreadsheet().toast(`Logged ${exerciseName} (Workout ${workoutLetter}) successfully!`);
    // Success is indicated by this function returning without error

  } catch (error) {
    Logger.log(`Error during logExercise for ${exerciseName}: ${error.message}`);
    // REMOVED: SpreadsheetApp.getUi().alert(`Failed to log exercise: ${error}`);
    // Rethrow the error so processLogForm can catch it and report it to the web app UI
    throw new Error(`Failed to log or update progression for ${exerciseName}: ${error.message}`);
  }
}