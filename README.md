# Krossover Coding Challenge Solution
This is a solution to the [Krossover coding challenge](coding-challenge.pdf) built using React JS, Browserify, LessCSS, Gulp and EventEmitter. A running demo can be found here: http://krossover.thinkloop.com/

### Installation
1. Clone the repo
2. Build the project by simply running `gulp` in the project root
3. Open `dist/index-1.0.0.html` in a browser

### Architecture
The app is composed of 3 distinct sections:

1. **Models**: Contain the app data. Completely decoupled and independent of any other part of the app. Have no knowledge of views.

2. **Components**: Contain the app views in the form of React components. Completely decoupled from the rest of the app. Have no knowledge of models.

3. **Events**: The glue that connects models and components. Events are broadcast from views, and responded to by listeners that effect changes in models, and re-renders components.

### Features
- **Liquid layout**: When the browser is expanded or contracted, elements adjust accordingly to fit on screen.
- **Intricate States**: Various elements are displayed, hidden or styled based on specific context, for example:
    - Save button does not show up if clip contents are empty
    - Play button changes style when a clip is played
    - Video stops playing if a different clip is being edited
- **Inline Clip Editing**: Rather than jarring the user with new interface elements for adding and editing clips, clips are modifiable inline is a WYSIWYG fashion.
- **Async Data Loaded in Parallel**: If you take a look at the `models.loadAll()` method, you will notice the use of the `nimble` lib to load `clips` and `fullVideo` in parallel (currently mocked, but ready for a real async backend)
- **Object Inheritance**: The `fullVideo` model inherits from the `clip` model using prototypical inheritance.
- **Continuous Build**: Gulp has been setup to watch changes in the code and automatically build the project on changes.
- **Automated Versioning**: The build process uses the version number in `package.json` to create files and folders with version numbers for easy cache invalidation and version tracking.
- **Event Tracking**: Open the console while using the site and notice that all events are logged. This can be easily extended to record all user interactions to a stats back-end.
- **Deployed and Hosted on CDN**: The running demo is currently hosted on AWS S3 & Cloudfront and scalable to millions of users.


### Sources of Improvement
-- **Time Validation**: The startTime and endTime for media fragments expect the format `hh:mm:ss`, but there is no validation or mask for the inputs that handle that data.
-- **IE Edge Compatibility**: Media fragments are not fully supported in IE, so an improved solution would be to seek using JS.

### Conclusion
This was a fun and useful excercise, and I would be happy to give a guided tour of the code at any time. 