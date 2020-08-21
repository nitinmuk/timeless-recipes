// Requiring our models and passport as we've configured it
const db = require("../models");
const passport = require("../config/passport");
// Requiring our custom middleware for checking if a user is logged in
const isAuthenticated = require("../config/middleware/isAuthenticated");
// require to create/get/update recipes
const ru = require("./routesUtil");
const axios = require("axios");

module.exports = function(app) {
  // eslint-disable-next-line prettier/prettier
  // Using the passport.authenticate middleware with our local strategy.
  // If the user has valid login credentials, send them to the members page.
  // Otherwise the user will be sent an error
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Sending back a password, even a hashed password, isn't a good idea
    res.json({
      email: req.user.email,
      id: req.user.id
    });
  });

  // Route for signing up a user. The user's password is automatically hashed and stored securely thanks to
  // how we configured our Sequelize User Model. If the user is created successfully, proceed to log the user in,
  // otherwise send back an error
  app.post("/api/signup", (req, res) => {
    db.User.create({
      username: req.body.username,
      email: req.body.email,
      password: req.body.password
    })
      .then(() => {
        res.redirect(307, "/api/login");
      })
      .catch(err => {
        res.status(401).json(err);
      });
  });

  // Route for logging user out
  app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
  });

  // Route for getting some data about our user to be used client side
  app.get("/api/user_data", (req, res) => {
    if (!req.user) {
      // The user is not logged in, send back an empty object
      res.json({});
    } else {
      // Otherwise send back the user's email and id
      // Sending back a password, even a hashed password, isn't a good idea
      res.json({
        username: req.user.username,
        email: req.user.email,
        id: req.user.id
      });
    }
  });

  app.post("/api/recipe", isAuthenticated, async (request, response) => {
    let recipeStatus = true;
    const recipe = await ru.createRecipe(request);
    recipeStatus = recipe ? true : false;
    const persistedIngredients = recipeStatus
      ? await ru.persistAndFetchIngredients(request)
      : undefined;
    recipeStatus = persistedIngredients ? true : false;
    recipeStatus = recipeStatus
      ? await ru.persistRecipeIngredients(request, persistedIngredients, recipe)
      : false;
    recipeStatus ? response.status(201).end() : response.status(500).end();
  });

  app.delete("/api/recipes/:id", isAuthenticated, async (request, response) => {
    const statusCode = await ru.deleteRecipe(request);
    response.status(statusCode).end();
  });

  app.get("/food-fact", async (request, response) => {
    axios
      .get(
        "https://api.spoonacular.com/food/trivia/random?apiKey=8dcefe9d9cdd4170802511b6c2f4b0b2"
      )
      .then(res => {
        response.json(res.data.text);
      })
      .catch(error => console.log("Error", error));
  });

  app.get("/food-joke", async (request, response) => {
    axios
      .get(
        "https://api.spoonacular.com/food/jokes/random?apiKey=8dcefe9d9cdd4170802511b6c2f4b0b2"
      )
      .then(res => {
        response.json(res.data.text);
      })
      .catch(error => console.log("Error", error));
  });

  app.post("/parse-ingredients", async (request, response) => {
    const requestData = {
      ingredientList: request.body.ingredientList,
      servings: request.body.servings
    };
    axios({
      method: "post",
      url:
        "https://api.spoonacular.com/recipes/parseIngredients?apiKey=7c4af557cc3a4d27a00082d3cc2023e1",
      params: requestData
    })
      .then(res => {
        response.json(res.data);
      })
      .catch(error => {
        response.json(error);
      });
  });
};
