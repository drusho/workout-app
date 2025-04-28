// /**
//  * Handles GET requests for the web app. Serves the main HTML interface.
//  */
// function doGet(e) {
//   // Create the HTML template from the file we already have
//   const htmlTemplate = HtmlService.createTemplateFromFile('LogExerciseSidebar');

//   // Evaluate the template to get the final HTML output
//   const htmlOutput = htmlTemplate.evaluate()
//       .setTitle('Workout Logger') // Sets browser tab title
//       .addMetaTag('viewport', 'width=device-width, initial-scale=1'); // Helps with mobile scaling

//   // Optional: Set XFrame options if embedding elsewhere, usually not needed for direct access
//   // .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);

//   return htmlOutput;
// }