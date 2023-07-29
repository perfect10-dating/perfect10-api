# language-learning-extenison-api
qBraid REST API server (node/express/mongoose)

## What is this?
A web API server is a way of running code remotely (i.e, not attached to a frontend). This is beneficial for a number of 
reasons:
1. We can analyze and modify highly sensitive information without exposing it publicly.
2. We can take advantage of AWS's high network speed by keeping our traffic on their subnets
3. We can communicate with our MongoDB database. This stores most of the data we use to make qBraid run.
4. We can create and use proprietary business logic (everything we send to the frontend may be copied or modified)

## How do I authenticate with the API?
In order to do certain restricted operations on the API, you may need to specify an auth token in a header. We do this by default in any of our frontend apps, so if you're comfortable with the JavaScript console, you can just hack a React component to do your bidding. Alternatively, you can recover an id-token and use that to authenticate your requests via Postman. Either way is valid, and you may need to be comfortable with both. 

### I'd like to hack the frontend:
1. Download React Developer Tools for your browser
2. Go to account.qbraid or qbook
3. Open the Developer Console (Right Click -> Inspect)
4. Go to the Components section (you may need to expand the tabs at the top of the console)
5. Select a component immediately below `App`. This component is most likely to have the `context` object attached to it.
6. Return to the JavaScript console. `$r` is a variable now attached to the console that exposes the `this` object of the component you have selected.
7. If you want to do API operations, `$r.context.getActions('ApiActions').query() ...` is your friend. Read the `superagent` documentation if you're unsure of what the query syntax is after this.

### I'd like to use Postman:
1. Do steps 1-6 above.
2. Download Postman
3. Run `console.log($r.context.getStore('AuthStore').getState().user)` in the JavaScript console.
4. This exposes the User object. Using the drop-downs, go to `signInUserSession` -> `idToken` -> `jwtToken`. Alternatively, you can run `console.log($r.context.getStore('AuthStore').getState().user.signInUserSession.idToken.jwtToken)` directly.
5. Copy this token. It should look a bit like a SHA key -- it should be long and not be readable.
6. In Postman, copy this token into the Headers tab under `VALUE`, making sure to delete any extraneous quotations or trailing lines. For `KEY`, you want `id-token`.
7. Proceed to send your Postman request.

### It's saying I need admin credentials for this route.
Sometimes you shouldn't be accessing or modifying confidential or sensitive information. You should confirm you need this information. Sometimes it's easier (and it's also safer!) to run a query using an API route you create temporarily to retrieve a single document. If you have access to MongoDB Atlas and merely need to retrieve information, you might try to find your document in their UI. They have more robust access control than we do, so this is safer than asking for blanket admin access. If you really must have admin access:
1. Sign-in to the AWS Managment Console.
2. Navigate to Cognito (can be found under services).
3. Select Manage User Pools and then select qbraid-users-2.
4. Take note of the Pool ID value under General settings at the top of the page.
5. Select Users and groups from the sidebar. Find the account associated with your email, and take note of the Username value in the far left column.
6. Install AWS CLI.
7. Run `aws cognito-idp admin-update-user-attributes --user-pool-id {Pool ID} --username {Username} --user-attributes Name="custom:role",Value="admin"` on the command line, inserting the Pool ID and Username values found in the AWS Console.
8. Contact Ryan Hill or Graeme Jacobson with any questions.

## Basic terms:
- Node is the runtime environment for the API server. It's sort of like JVM or other language-specific runtimes
- Express does the actual routing, allowing each endpoint to accomplish a different function
- MongoDB is our database (kind of like SQL, except free-form. MongoDB is to SQL as JavaScript is to C). Using MongoDB, we can save free-form data into a database, and recover it efficiently (look up indexing). It lives on an entirely separate server, which we connect to whenever we start an API server (even a localhost build). Currently, our production and testing servers use the same database, so be careful!
  - When we talk about MongoDB, we speak in terms of Collections and Documents. A Collection is a group of Documents. We often choose to enforce some sort of consistent structure between documents of the same Collection.
- Mongoose is our MongoDB driver. We can use it to enforce rigid document construction on our otherwise free-form database. When you save a Mongoose object in the API, Mongoose will attempt to validate that object against a Schema associated with each Model. However, please note that Mongoose will not change any documents already in a Collection if you modify a Schema, so you often will have to be tolerant of legacy Documents.
  - A Model provides the programming interface to save JavaScript and Mongoose objects into Documents. Each Model is generally associated with a single Collection in MongoDB. Each Model also has a Schema for validation purposes.

## What is the basic routing structure of the API?
We use two different types of route: node-restful and standard express routes:

### Standard API Routes
Each route is defined and registered in its own file. If there are several related routes, they may share a file. This is often done if we need to interact with a certain document in multiple different ways, like upvoting an article and also starring it and also viewing it. API routes generally will have some set of operations where they query files in the MongoDB database (using .find or .findOne on a model). They will then use the retrieved documents as JavaScript objects, modify them accordingly, and then either save or otherwise modify our persistent database. Many of our routes are "getters", meaning no modification occurs.

### Node-Restful
This is a third-party package that has not been maintained since 2017 (and hence we may want to fork or maintain it in the near future). Node-Restful provides a relay directly to the MongoDB API. When you see a Schema/Model defined in the API, it will usually be registered in `api.js` with a Node-Restful route.

#### Middleware:
Rather than defining an explicit set of behaviours like with a standard API route, Node-Restful defines a set of default behaviours.
- A GET to a route will return all documents matching your query parameters (if any). No query parameters means returning the entire list of documents, which may be very expensive on larger collections.
- A POST to a route will check if the submitted document (usually a JSON object in req.body) matches the schema underlying the collection.
- A PUT to a `route/the_mongodb_id_of_document_to_modify` will overwrite the fields you specify in your body onto the underlying document.
- A DELETE to a `route/the_mongodb_id_of_document_to_modify` will delete the document.

It's pretty clearly dangerous to allow anyone to modify, delete (or even view!) sensitive information. So each route has `before` and `after` handlers for `get, put, post` and `delete`. These can be used to modify mongoose objects or conduct different operations prior to or after the MongoDB transaction.

#### Example: quiz-question routes
See [QuizQuestionSchema](https://github.com/qBraid/qbraid-api/blob/master/models/schemas/QuizQuestionSchema.js) for body formatting

__GET__
* fetch all quiz questions: ```GET http://api.qbraid.com/api/admin/quiz-question```
* fetch one quiz question by its _customId_: ```GET http://api.qbraid.com/api/quiz-question/:customId```
* fetch one quiz question by its _\_id_: ```GET http://api.qbraid.com/api/admin/quiz-question/:_id```

__PUT__
* Edit one quiz question by its _\_id_: ```PUT http://api.qbraid.com/api/admin/quiz-question/:_id```
  * In the body, provide only the keys and new values of QuizQuestionSchema fields to edit (not the whole object)

__POST__
* Create one quiz question: ```POST http://api.qbraid.com/api/admin/quiz-question```
  * In the body, provide the keys and initial values of the required QuizQuestionSchema fields, excluding _customId_, which will be automatically created from the _prompt_, value. Format: <first 20 alphanumeric letters of prompt, with dashes for spaces>-<10 random alphanumeric characters>
* Submit a response to a quiz question: ```POST http://api.qbraid.com/api/quiz-question/submit```
  * See [QuizQuestionResponseSchema](https://github.com/qBraid/qbraid-api/blob/master/models/schemas/QuizQuestionResponseSchema.js) for body formatting

__DELETE__
* Delete one quiz question by its _\_id_: ```DELETE http://api.qbraid.com/api/admin/quiz-question/:_id```
  * Note: this endpoint returns an empty response

### Style Choices
There are tradeoffs between dedicated routes and node-restful behavior. To preface everything, I personally prefer dedicated routes. Jared prefers node-restful. 

| Category      | Node-Restful | Dedicated Route |
|---------------|--------------|-----------------|
|Ease of use    |Node-Restful allows immediate setup and most basic operations on documents. It's also standardized. Get/Put/Post/Delete will work immediately.|Dedicated routes are less confusing for more complicated operations, and will result in fewer bugs. Some operations like nested populates are far easier in dedicated routes than node-restful. |
|Efficiency     |Node-Restful is very efficient in simple POST requests, and perhaps PUTs.|Dedicated routes are more efficient for practically anything else. When querying MongoDB, you can use `.lean()` if you're willing to work with plain JavaScript objects. You can also use `.select()` to recover only the fields that you are interested in. Both these strategies markedly improve performance. Performance may be further improved by using in-place update operations Mongoose provides. These modify documents on MongoDB without having to transmit Mongoose objects.|
|Scalability    |Node-Restful gets in your way when you need to do too many different types of modifications on the underlying document.|Dedicated routes are intended to be segmented based on usage. They're easier to organize in a sane way, but can still be confusing. |
|Security       |Node-Restful can have handlers overridden to blacklist certain behaviours, or to fully intercept the operation and treat it separately (like a normal route would). At this point, you should be asking yourself if you want a normal route instead. Done poorly, it's not difficult to recover sensitive information via Node-Restful. For instance, we require admin credentials to access user models. However, at the time of this writing, ClassModel was unprotected and has `teacher` and `student` fields, that may be populated to recover privileged data.|Dedicated routes are much easier to secure, as they use a whitelist of behaviors. Using `.select()` can prevent recovery of sensitive information even to the API. Done correctly, sensitive information will never reach the frontend, because you will never _bother asking for it_. |
|Debugging      |Node-Restful is the undisputed king here. If you're adding or recovering information for testing purposes, you want to be using Node-Restful rather than a dedicated route.|Don't bother.|
