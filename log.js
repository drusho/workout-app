// /**
//  * Helper function to find the row index for a specific exercise.
//  * @param {Sheet} sheet The sheet to search within (e.g., WorkoutDefinitions).
//  * @param {string} exerciseName The name of the exercise to find.
//  * @param {number} columnNameIndex The 0-based index of the column containing exercise names.
//  * @returns {number} The 1-based row index of the exercise, or -1 if not found.
//  */
// function findExerciseRowIndex(sheet, exerciseName, columnNameIndex) {
//   const data = sheet.getDataRange().getValues();
//   // Start from row 1 to skip header
//   for (let i = 1; i < data.length; i++) {
//     if (data[i][columnNameIndex].toString().trim().toLowerCase() === exerciseName.trim().toLowerCase()) {
//       return i + 1; // Return 1-based index for sheet range methods
//     }
//   }
//   return -1; // Not found
// }


// /**
//  * Logs a completed exercise to the WorkoutLog sheet and triggers progression update.
//  * @param {string} exerciseName The name of the exercise performed.
//  * @param {number} setsPerformed Actual sets completed.
//  * @param {number} repsPerformed Actual reps completed (e.g., on the last set or target achieved).
//  * @param {number} weightUsed The weight used for the exercise.
//  * @param {number} rpe The Rate of Perceived Exertion (1-10) recorded for the exercise.
//  */
// function logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe) {
//   const sheets = getSheets();
//   if (!sheets) return;

//   const timestamp = new Date();
//   const workoutLetter = getWorkoutLetterForToday(); // Or potentially get from the context where it's called

//   if (!exerciseName || setsPerformed == null || repsPerformed == null || weightUsed == null || rpe == null) {
//     SpreadsheetApp.getUi().alert("Error logging exercise: Missing one or more values.");
//     return;
//   }
//   if (isNaN(setsPerformed) || isNaN(repsPerformed) || isNaN(weightUsed) || isNaN(rpe)) {
//     SpreadsheetApp.getUi().alert("Error logging exercise: Sets, Reps, Weight, and RPE must be numbers.");
//     return;
//   }

//   try {
//     // Append to WorkoutLog sheet
//     sheets.logSheet.appendRow([
//       timestamp,
//       workoutLetter || "N/A", // Handle case where it might be logged on a non-workout day
//       exerciseName,
//       setsPerformed,
//       repsPerformed,
//       weightUsed,
//       rpe
//     ]);
//     Logger.log(`Logged: ${exerciseName}, Sets: ${setsPerformed}, Reps: ${repsPerformed}, Weight: ${weightUsed}, RPE: ${rpe}`);

//     // Trigger the progression update for the *next* workout
//     updateCycleProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe);

//     SpreadsheetApp.getActiveSpreadsheet().toast(`Logged ${exerciseName} successfully!`);

//   } catch (error) {
//     Logger.log(`Error in logExercise: ${error}`);
//     SpreadsheetApp.getUi().alert(`Failed to log exercise: ${error}`);
//   }
// }


// /**
//  * Updates the target sets, reps, or weight for the next workout based on RPE.
//  * (Removed UI elements like alerts and toasts for Web App compatibility)
//  * @param {string} exerciseName The name of the exercise performed.
//  * @param {number} setsPerformed Actual sets completed in the logged workout.
//  * @param {number} repsPerformed Actual reps completed in the logged workout.
//  * @param {number} weightUsed The weight used for the logged workout.
//  * @param {number} rpe The RPE recorded for the logged workout.
//  * @throws {Error} Throws error if update logic fails.
//  */
// /**
//  * Updates the cycle step and weight for the next workout based on RPE.
//  * Assumes progression type is 'Cycle'. Handles other types by returning.
//  */
// function updateCycleProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe) {
//   const sheets = getSheets();
//   if (!sheets) return; // Error handled in getSheets

//   Logger.log(`--- Starting Cycle Progression Check for: ${exerciseName} ---`);
//   Logger.log(`Logged RPE: ${rpe}, Weight Used: ${weightUsed}`); // weightUsed is weight from workout JUST completed

//   try {
//     // Find exercise row and map headers (ensure new columns are included)
//     const defData = sheets.defSheet.getDataRange().getValues();
//     const headers = defData[0];
//     const headerMap = {};
//     headers.forEach((header, index) => { headerMap[header.trim()] = index; });

//     const requiredHeaders = [ /* "Exercise Name", "Current Cycle Step", "Cycle Base Weight", "Current Weight", "Target Reps Min", "Progression Type" */]; // Update as needed
//     // ... (validate headers) ...

//     const rowIndex = findExerciseRowIndex(sheets.defSheet, exerciseName, headerMap["Exercise Name"]);
//     if (rowIndex === -1) throw new Error(`Exercise ${exerciseName} not found.`);

//     const exerciseData = defData[rowIndex - 1];
//     const progressionType = exerciseData[headerMap["Progression Type"]].toString().toLowerCase();

//     // Only apply to 'cycle' type
//     if (progressionType !== 'cycle') {
//       Logger.log(`Skipping cycle progression for ${exerciseName} (Type: ${progressionType}).`);
//       return;
//     }

//     // --- Read current state ---
//     const currentCycleStep = parseInt(exerciseData[headerMap["Current Cycle Step"]]);
//     const cycleBaseWeight = parseFloat(exerciseData[headerMap["Cycle Base Weight"]]);
//     // Current Weight in the sheet is the weight for the *next* workout.
//     // We need the weight from the workout *just completed*, which is passed in as weightUsed.
//     const completedWeight = weightUsed;
//     const minReps = parseInt(exerciseData[headerMap["Target Reps Min"]]);

//     Logger.log(`Current State: Step=${currentCycleStep}, BaseW=${cycleBaseWeight}, CompletedW=${completedWeight}, MinReps=${minReps}`);

//     // Check for parsing errors
//     if (isNaN(currentCycleStep) || isNaN(cycleBaseWeight) || isNaN(completedWeight) || isNaN(minReps)) {
//       throw new Error(`Invalid number format found in sheet for ${exerciseName}.`);
//     }

//     // --- Determine Next Step ---
//     let nextCycleStep = currentCycleStep;
//     let nextWeight = completedWeight; // Default: Keep same weight if repeating step
//     let nextBaseWeight = cycleBaseWeight; // Default: Base weight stays same within cycle
//     let progressionApplied = false;

//     if (rpe <= 8) {
//       // Progress to the next step if RPE allows
//       nextCycleStep = currentCycleStep + 1;
//       progressionApplied = true;
//       Logger.log(`RPE <= 8. Progressing from step ${currentCycleStep} to ${nextCycleStep}.`);
//     } else {
//       // Repeat the current step if RPE > 8
//       nextCycleStep = currentCycleStep;
//       progressionApplied = false; // Or call it "repeat"
//       Logger.log(`RPE > 8. Repeating step ${currentCycleStep}.`);
//     }

//     // --- Calculate Specific Parameters for the NEXT Workout ---
//     let calculatedNextSets = 0; // For logging/toast only, not saved
//     let calculatedNextReps = ""; // For logging/toast only, not saved

//     switch (nextCycleStep) {
//       case 1:
//         calculatedNextSets = 3; calculatedNextReps = minReps;
//         nextWeight = nextBaseWeight; // Use the potentially updated base weight
//         break;
//       case 2:
//         calculatedNextSets = 4; calculatedNextReps = minReps;
//         nextWeight = nextBaseWeight;
//         break;
//       case 3:
//         calculatedNextSets = 3; calculatedNextReps = minReps;
//         nextWeight = nextBaseWeight + 5;
//         break;
//       case 4:
//         calculatedNextSets = 4; calculatedNextReps = minReps;
//         nextWeight = nextBaseWeight + 5;
//         break;
//       case 5:
//         calculatedNextSets = 3; calculatedNextReps = minReps + 2;
//         nextWeight = nextBaseWeight + 5;
//         break;
//       case 6:
//         calculatedNextSets = 4; calculatedNextReps = minReps + 2;
//         nextWeight = nextBaseWeight + 5;
//         break;
//       case 7:
//         calculatedNextSets = 3; calculatedNextReps = minReps + 2;
//         nextWeight = nextBaseWeight + 10; // W7 uses Base+10lbs
//         break;
//       case 8: // AMRAP Prep
//         calculatedNextSets = 1; calculatedNextReps = "AMRAP";
//         // Calculate weight based on W7's weight (which is the 'completedWeight' if coming from step 7)
//         if (currentCycleStep === 7 && progressionApplied) { // Ensure we are progressing from step 7
//           nextWeight = (completedWeight / 0.82) * 0.90;
//           nextWeight = Math.round(nextWeight / 2.5) * 2.5; // Optional: Round to nearest 2.5 lbs
//           Logger.log(`Calculated AMRAP weight for Step 8: ${nextWeight} (based on W7 weight ${completedWeight})`);
//         } else {
//           // If repeating step 8 or coming from somewhere else (error?), use previous weight or handle error
//           nextWeight = completedWeight; // Repeat with same weight if RPE > 8 on step 8
//           Logger.log(`Repeating Step 8 or invalid previous step. Using weight: ${nextWeight}`);
//         }
//         break;
//       case 9: // Cycle completed, reset to Step 1
//         Logger.log(`Cycle complete (Step 8 RPE <= 8). Resetting to Step 1.`);
//         nextCycleStep = 1; // Reset step number
//         // Reset Base Weight for the NEW cycle based on W7's weight + 5 lbs
//         // 'completedWeight' here should be the weight used in the Step 8 AMRAP
//         // Let's base the *new* base weight on the weight used in STEP 7 for simplicity.
//         // Need to retrieve W7 weight if we just completed W8. For now, use W8 weight.
//         // SAFER: Assume the W7 weight was BaseWeight+10. New Base = (BaseWeight+10)+5
//         nextBaseWeight = cycleBaseWeight + 15; // Simpler reset: Old Base + 15lbs
//         Logger.log(`Resetting Base Weight for new cycle to: ${nextBaseWeight}`);

//         calculatedNextSets = 3; calculatedNextReps = minReps;
//         nextWeight = nextBaseWeight; // Step 1 uses the new base weight
//         break;
//       default:
//         // Should not happen if logic is correct
//         Logger.log(`ERROR: Invalid nextCycleStep calculated: ${nextCycleStep}`);
//         throw new Error(`Invalid next cycle step calculated for ${exerciseName}`);
//     }

//     // --- Update Sheet with values for the NEXT workout ---
//     Logger.log(`Updating Sheet: Row=${rowIndex}, Next Step=${nextCycleStep}, Next Weight=${nextWeight}, Next Base Weight=${nextBaseWeight}`);
//     sheets.defSheet.getRange(rowIndex, headerMap["Current Cycle Step"] + 1).setValue(nextCycleStep);
//     sheets.defSheet.getRange(rowIndex, headerMap["Current Weight"] + 1).setValue(nextWeight);
//     // Only update Base Weight if it changed (i.e., after completing step 8)
//     if (nextBaseWeight !== cycleBaseWeight) {
//       sheets.defSheet.getRange(rowIndex, headerMap["Cycle Base Weight"] + 1).setValue(nextBaseWeight);
//     }

//     // --- Optional: Toast message ---
//     let toastMessage = `${exerciseName}: `;
//     if (progressionApplied && currentCycleStep !== 8) {
//       toastMessage += `Next workout set to Step ${nextCycleStep} (${calculatedNextSets}x${calculatedNextReps} @ ${nextWeight} lbs).`;
//     } else if (progressionApplied && currentCycleStep === 8) {
//       toastMessage += `Cycle complete! Reset to Step 1 (${calculatedNextSets}x${calculatedNextReps} @ ${nextWeight} lbs). New Base Weight: ${nextBaseWeight} lbs.`;
//     } else { // RPE > 8
//       toastMessage += `Repeat Step ${currentCycleStep} (${calculatedNextSets}x${calculatedNextReps} @ ${nextWeight} lbs).`;
//     }
//     // SpreadsheetApp.getActiveSpreadsheet().toast(toastMessage, "Progression Update", 6); // Re-enable if desired, but will fail in webapp

//     Logger.log(`--- Finished Cycle Progression Check for: ${exerciseName} ---`);

//   } catch (error) {
//     Logger.log(`!!! ERROR in updateCycleProgression for ${exerciseName}: ${error.message}`);
//     Logger.log(`Stack: ${error.stack ? error.stack : 'N/A'}`);
//     // Rethrow error to be caught by logExercise/processLogForm
//     throw new Error(`Cycle progression failed for ${exerciseName}: ${error.message}`);
//   }
// }


// /**
//  * Creates and shows the log exercise sidebar.
//  * The sidebar will initially prompt user to select workout letter.
//  */
// function showLogSidebar() {
//   // Create HTML template from the file - No need to pass exercises initially
//   const htmlTemplate = HtmlService.createTemplateFromFile('LogExerciseSidebar');

//   // We are NOT passing exerciseOptions here anymore.
//   // The sidebar's JS will call getExercisesForWorkoutLetter() itself.

//   // Evaluate the template to get the final HTML output
//   const htmlOutput = htmlTemplate.evaluate()
//     .setTitle('Log Exercise')
//     .setWidth(320); // Adjusted width slightly

//   SpreadsheetApp.getUi().showSidebar(htmlOutput);
// }


// /**
//  * Processes the form data submitted from the sidebar.
//  * This function is called by google.script.run from the sidebar's JS.
//  * @param {object} formData The data object sent from the sidebar form, INCLUDING workoutLetter.
//  * @returns {string} A success message to be shown in the sidebar.
//  * @throws {Error} An error message if validation fails or logging fails.
//  */
// function processLogForm(formData) {
//   Logger.log(`--- processLogForm: Started ---`); // Log start
//   Logger.log(`processLogForm: Received formData: ${JSON.stringify(formData)}`);
//   try {
//     // --- Validation ---
//     Logger.log(`processLogForm: Validating data...`);
//     const workoutLetter = formData.workoutLetter;
//     const exerciseName = formData.exerciseName;
//     // Ensure formData has all needed properties before parsing
//     if (!formData.setsPerformed || !formData.repsPerformed || !formData.weightUsed || !formData.rpe) {
//       throw new Error("Missing required form data fields (sets, reps, weight, or rpe).");
//     }
//     const setsPerformed = parseInt(formData.setsPerformed);
//     const repsPerformed = parseInt(formData.repsPerformed);
//     const weightUsed = parseFloat(formData.weightUsed);
//     const rpe = parseInt(formData.rpe);

//     if (!workoutLetter || !['A', 'B', 'C'].includes(workoutLetter.toUpperCase())) {
//       throw new Error("Workout Letter is missing or invalid.");
//     }
//     if (!exerciseName) throw new Error("Exercise name is missing.");
//     if (isNaN(setsPerformed) || setsPerformed <= 0) throw new Error("Invalid 'Sets Performed'.");
//     if (isNaN(repsPerformed) || repsPerformed <= 0) throw new Error("Invalid 'Reps Performed'.");
//     if (isNaN(weightUsed) || weightUsed < 0) throw new Error("Invalid 'Weight Used'.");
//     if (isNaN(rpe) || rpe < 1 || rpe > 10) throw new Error("Invalid 'RPE'.");
//     Logger.log(`processLogForm: Validation complete. Data: L=${workoutLetter}, Ex=${exerciseName}, S=${setsPerformed}, R=${repsPerformed}, W=${weightUsed}, RPE=${rpe}`);

//     // --- Call logExercise ---
//     Logger.log(`processLogForm: Calling logExercise...`);
//     logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetter); // This might throw an error if logExercise or updateCycleProgression fails
//     Logger.log(`processLogForm: logExercise call completed.`);

//     // --- Prepare Return Object ---
//     const returnData = {
//       message: `${exerciseName} logged successfully for Workout ${workoutLetter}!`,
//       loggedData: {
//         name: exerciseName,
//         sets: setsPerformed,
//         reps: repsPerformed,
//         weight: weightUsed,
//         rpe: rpe
//       }
//     };
//     Logger.log(`processLogForm: Prepared return data: ${JSON.stringify(returnData)}`);
//     Logger.log(`--- processLogForm: Finished Successfully ---`);
//     return returnData; // Return the success object

//   } catch (error) {
//     // --- Catch ANY error during validation or logExercise call ---
//     Logger.log(`!!! ERROR in processLogForm: ${error.message}`);
//     Logger.log(`processLogForm Error Stack: ${error.stack ? error.stack : 'No stack trace'}`);
//     Logger.log(`--- processLogForm: Finished with ERROR ---`);
//     // IMPORTANT: Re-throw the error so the client-side 'withFailureHandler' is triggered
//     throw new Error(`Failed to process log: ${error.message}`);
//   }
// } function processLogForm(formData) {
//   Logger.log(`--- processLogForm: Started ---`); // Log start
//   Logger.log(`processLogForm: Received formData: ${JSON.stringify(formData)}`);
//   try {
//     // --- Validation ---
//     Logger.log(`processLogForm: Validating data...`);
//     const workoutLetter = formData.workoutLetter;
//     const exerciseName = formData.exerciseName;
//     // Ensure formData has all needed properties before parsing
//     if (!formData.setsPerformed || !formData.repsPerformed || !formData.weightUsed || !formData.rpe) {
//       throw new Error("Missing required form data fields (sets, reps, weight, or rpe).");
//     }
//     const setsPerformed = parseInt(formData.setsPerformed);
//     const repsPerformed = parseInt(formData.repsPerformed);
//     const weightUsed = parseFloat(formData.weightUsed);
//     const rpe = parseInt(formData.rpe);

//     if (!workoutLetter || !['A', 'B', 'C'].includes(workoutLetter.toUpperCase())) {
//       throw new Error("Workout Letter is missing or invalid.");
//     }
//     if (!exerciseName) throw new Error("Exercise name is missing.");
//     if (isNaN(setsPerformed) || setsPerformed <= 0) throw new Error("Invalid 'Sets Performed'.");
//     if (isNaN(repsPerformed) || repsPerformed <= 0) throw new Error("Invalid 'Reps Performed'.");
//     if (isNaN(weightUsed) || weightUsed < 0) throw new Error("Invalid 'Weight Used'.");
//     if (isNaN(rpe) || rpe < 1 || rpe > 10) throw new Error("Invalid 'RPE'.");
//     Logger.log(`processLogForm: Validation complete. Data: L=${workoutLetter}, Ex=${exerciseName}, S=${setsPerformed}, R=${repsPerformed}, W=${weightUsed}, RPE=${rpe}`);

//     // --- Call logExercise ---
//     Logger.log(`processLogForm: Calling logExercise...`);
//     logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetter); // This might throw an error if logExercise or updateCycleProgression fails
//     Logger.log(`processLogForm: logExercise call completed.`);

//     // --- Prepare Return Object ---
//     const returnData = {
//       message: `${exerciseName} logged successfully for Workout ${workoutLetter}!`,
//       loggedData: {
//         name: exerciseName,
//         sets: setsPerformed,
//         reps: repsPerformed,
//         weight: weightUsed,
//         rpe: rpe
//       }
//     };
//     Logger.log(`processLogForm: Prepared return data: ${JSON.stringify(returnData)}`);
//     Logger.log(`--- processLogForm: Finished Successfully ---`);
//     return returnData; // Return the success object

//   } catch (error) {
//     // --- Catch ANY error during validation or logExercise call ---
//     Logger.log(`!!! ERROR in processLogForm: ${error.message}`);
//     Logger.log(`processLogForm Error Stack: ${error.stack ? error.stack : 'No stack trace'}`);
//     Logger.log(`--- processLogForm: Finished with ERROR ---`);
//     // IMPORTANT: Re-throw the error so the client-side 'withFailureHandler' is triggered
//     throw new Error(`Failed to process log: ${error.message}`);
//   }
// }


// /**
//  * Gets the details (name, sets, reps, weight) for exercises of a specific workout letter.
//  * @param {string} letter The workout letter (A, B, or C).
//  * @returns {Array<object>} A list of exercise detail objects, e.g.,
//  * [{ name: "Ex1", sets: 2, reps: 5, weight: 100 }, ...].
//  * @throws {Error} If letter is invalid or columns not found.
//  */
// function getWorkoutDetails(letter) {


//   const requiredHeaders = [
//     "Workout Letter", "Exercise Name", "Target Reps Min", "Current Weight",
//     "Cycle Base Weight", "Current Cycle Step", "Progression Type"
//   ];

//   if (!letter || !['A', 'B', 'C'].includes(letter.toUpperCase())) {
//     throw new Error("Invalid workout letter provided.");
//   }

//   const sheets = getSheets();
//   if (!sheets) {
//     throw new Error("Could not access spreadsheet sheets.");
//   }

//   const dataRange = sheets.defSheet.getDataRange();
//   const values = dataRange.getValues();
//   const headers = values[0];
//   const headerMap = {};
//   headers.forEach((header, index) => { headerMap[header.trim()] = index; });

//   for (const header of requiredHeaders) {
//     if (headerMap[header] === undefined) {
//       const errorMsg = `Error: Missing required header column '${header}' in WorkoutDefinitions sheet.`;
//       Logger.log(errorMsg);
//       throw new Error(errorMsg);
//     }
//   }

//   const workoutDetails = [];
//   const letterColIndex = headerMap["Workout Letter"];
//   const nameColIndex = headerMap["Exercise Name"];
//   const setsColIndex = headerMap["Current Target Sets"];
//   const repsColIndex = headerMap["Current Target Reps"];
//   const weightColIndex = headerMap["Current Weight"];

//   // Start from row 1 to skip header
//   for (let i = 1; i < values.length; i++) { // Loop through definitions
//     const row = values[i];
//     if (row[letterColIndex].toString().toUpperCase() === letter.toUpperCase()) {
//       const exerciseName = row[nameColIndex];
//       const progType = row[progTypeColIndex].toString().toLowerCase();
//       const currentWeight = parseFloat(row[currentWeightColIndex]); // Weight for NEXT workout
//       let targetSets = "-"; // Default display
//       let targetReps = "-"; // Default display

//       if (progType === 'cycle') {
//         const cycleStep = parseInt(row[cycleStepColIndex]);
//         const baseWeight = parseFloat(row[baseWeightColIndex]); // Base weight for the cycle
//         const minReps = parseInt(row[minRepColIndex]);

//         // Calculate sets/reps based on the *upcoming* cycle step
//         switch (cycleStep) {
//           case 1: targetSets = 3; targetReps = minReps; break;
//           case 2: targetSets = 4; targetReps = minReps; break;
//           case 3: targetSets = 3; targetReps = minReps; break;
//           case 4: targetSets = 4; targetReps = minReps; break;
//           case 5: targetSets = 3; targetReps = minReps + 2; break;
//           case 6: targetSets = 4; targetReps = minReps + 2; break;
//           case 7: targetSets = 3; targetReps = minReps + 2; break;
//           case 8: targetSets = 1; targetReps = "AMRAP"; break; // Special case for AMRAP
//           default: Logger.log(`Invalid cycle step ${cycleStep} for ${exerciseName}`); break;
//         }
//       } else if (progType === 'failure') {
//         targetSets = parseInt(row[headerMap["Target Sets Min"]]); // Need to add Target Sets Min back if using Failure type
//         targetReps = "Failure";
//       } // Add other types if needed

//       workoutDetails.push({
//         name: exerciseName,
//         sets: targetSets,
//         reps: targetReps,
//         weight: currentWeight // Display the weight scheduled for the next workout
//       });
//     }
//   }
//   Logger.log(`Found details for workout ${letter}: ${JSON.stringify(workoutDetails)}`);
//   return workoutDetails;
// }


// /**
//  * Logs a completed exercise to the WorkoutLog sheet and triggers progression update.
//  * (Removed UI elements like alerts and toasts for Web App compatibility)
//  * @param {string} exerciseName The name of the exercise performed.
//  * @param {number} setsPerformed Actual sets completed.
//  * @param {number} repsPerformed Actual reps completed (e.g., on the last set or target achieved).
//  * @param {number} weightUsed The weight used for the exercise.
//  * @param {number} rpe The Rate of Perceived Exertion (1-10) recorded for the exercise.
//  * @param {string} [workoutLetterOverride] Optional: The specific workout letter being logged (e.g., from form).
//  * @throws {Error} Throws error if logging fails or progression fails.
//  */
// function logExercise(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe, workoutLetterOverride = null) {
//   // Removed validation alerts - errors will be caught by processLogForm if inputs are bad
//   // Logger calls remain for debugging

//   const sheets = getSheets();
//   // If getSheets threw an error, sheets will be null or the error bubbles up
//   if (!sheets) {
//     Logger.log("logExercise failed: Could not get sheets.");
//     throw new Error("Failed to access spreadsheet sheets."); // Propagate error
//   }

//   const timestamp = new Date();
//   const workoutLetter = workoutLetterOverride || getWorkoutLetterForToday(); // Determine letter

//   // Main logic wrapped in try-catch
//   try {
//     // Append to WorkoutLog sheet
//     sheets.logSheet.appendRow([
//       timestamp,
//       workoutLetter || "N/A", // Use the determined letter
//       exerciseName,
//       setsPerformed,
//       repsPerformed,
//       weightUsed,
//       rpe
//     ]);
//     Logger.log(`Logged: ${exerciseName} for Workout ${workoutLetter}, Sets: ${setsPerformed}, Reps: ${repsPerformed}, Weight: ${weightUsed}, RPE: ${rpe}`);

//     // Trigger the progression update for the *next* workout
//     // This might throw an error if progression fails, which will be caught below
//     updateCycleProgression(exerciseName, setsPerformed, repsPerformed, weightUsed, rpe);

//     // REMOVED: SpreadsheetApp.getActiveSpreadsheet().toast(`Logged ${exerciseName} (Workout ${workoutLetter}) successfully!`);
//     // Success is indicated by this function returning without error

//   } catch (error) {
//     Logger.log(`Error during logExercise for ${exerciseName}: ${error.message}`);
//     // REMOVED: SpreadsheetApp.getUi().alert(`Failed to log exercise: ${error}`);
//     // Rethrow the error so processLogForm can catch it and report it to the web app UI
//     throw new Error(`Failed to log or update progression for ${exerciseName}: ${error.message}`);
//   }
// }