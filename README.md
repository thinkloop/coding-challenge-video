# Code Challenge Solution
This is a solution to [the code challenge](coding-challenge.pdf) built using React JS, Browserify, LessCSS, Gulp and EventEmitter in Flux-style. A running demo can be found here: http://krossover.thinkloop.com/

### Installation
1. Clone the repo
2. Build the project by running `gulp` in the project root
3. Open `dist/index-1.0.1.html` in a browser

### Architecture
The app is composed of 3 distinct parts:

1. **Models**: Contain the app data. Decoupled and independent of other parts of the app. Have no knowledge of views.

2. **Components**: Contain the app views in the form of React components. Decoupled from the rest of the app. Have no knowledge of models.

3. **Events**: The glue that connects models and components. Events are broadcast from views, and responded to by listeners that make changes to models, and re-render components.

### Features
 
- **Intricate States**: Various elements are displayed, hidden or styled based on context, for example:
    - _Play button_ changes style when a clip is being played
    - _Save button_ is hidden if clip has no data in any of its fields
    - _Video_ stops playing when a different clip is selected for editing

- **Inline Clip Editing**: Rather than jarring the user with new interface elements for adding and editing clips, clips are modified inline in a WYSIWYG fashion.

- **Data Loads in Parallel**: In the `loadAll()` method of the `models/models` object, you will notice the use of the `nimble` library to load the `clips` and `fullVideo` models in parallel.

- **Continuous Build**: Gulp has been setup to watch changes in the code and automatically build the project upon changes.

- **Automated Versioning**: The build process uses the version number in `package.json` to create files and folders with version numbers for easy cache invalidation and version tracking.

- **Event Tracking**: Open the console while using the site and notice all events being logged. This can be extended easily to save all user interactions to a statistics backend.

- **Object Inheritance**: The `fullVideo` model inherits from the `clip` model using prototypical inheritance.

- **Deployed and Hosted on CDN**: The running demo is currently hosted on AWS S3 & Cloudfront and scalable to millions of users.

- **Liquid layout**: When the browser is expanded or contracted, elements adjust accordingly to fit on screen.


### Sources of Improvement
- **Data validation**: The `startTime` and `endTime` of a clip expect the format `hh:mm:ss`, but there is currently no validation or masks for these inputs, or other inputs.

- **Detect when a clip finishes playing**: When a clip finishes playing, no app events are fired to update the UI or perform other actions.

- **Add safeguards when deleting clips**: Clicking the clip delete button instantly deletes a clip without confirmation or safeguards.

- **Mobile compatibility**: I did not verify whether the app looks good on mobile OS's (android, ios, wp, etc.).

- **IE compatibility**: Media fragments are not fully supported in IE/Edge, an improved solution would be to use Javascript to navigate the video.

### Conclusion
I would be happy to give a guided tour of the code at any time. 