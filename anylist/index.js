const AnyList = require("anylist");
const express = require("express");
const minimist = require("minimist");

const args = minimist(process.argv.slice(2));

const PORT = args["port"] || process.env.PORT || 8080;
const EMAIL = args["email"] || process.env.EMAIL;
const PASSWORD = args["password"] || process.env.PASSWORD;
const IP_FILTER = args["ip-filter"] || process.env.IP_FILTER;
const DEFAULT_LIST = args["default-list"] || process.env.DEFAULT_LIST;
const CREDENTIALS_FILE = args["credentials-file"] || process.env.CREDENTIALS_FILE;

async function initialize(onInitialized) {
    let any = new AnyList({email: EMAIL, password: PASSWORD, credentialsFile: CREDENTIALS_FILE});
    await any.login(false);
    await any.getLists();
    return await onInitialized(any);
}

async function getLists() {
    return initialize(async (any) => {
        return any.lists.map(list => list.name);
    });
}

function normalizeListName(name) {
    return name.trim().toUpperCase();
}

function getListByName(any, name) {
    return any.lists.find(l => normalizeListName(l.name) === normalizeListName(name));
}

async function getItems(listName) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return null;
        }

        let items = list.items
        return items
            .map(item => {
                return {
                    name: item.name,
                    id: item.identifier,
                    checked: item.checked || false,
                    notes: item.details || ""
                };
            });
    });
}

async function removeItemByName(listName, itemName) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (item) {
            await list.removeItem(item);
            return 200;
        } else {
            return 304;
        }
    });
}

async function removeItemById(listName, itemId) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemById(itemId);
        if (item) {
            await list.removeItem(item);
            return 200;
        } else {
            return 304;
        }
    });
}

function lookupItemCategory(any, listId, itemName) {
    let recentItems = any.getRecentItemsByListId(listId);
    if (!recentItems) {
        return null;
    }

    let recentItem = recentItems.find((item) => {
        return item.name.toLowerCase() == itemName.toLowerCase();
    });

    if (!recentItem) {
        return null;
    }

    return recentItem.categoryMatchId;
}

function populateItemUpdates(item, updates) {
    if ("name" in updates) {
        item.name = updates["name"];
    }

    if ("checked" in updates) {
        item.checked = updates["checked"];
    }

    if ("notes" in updates) {
        item.details = updates["notes"];
    }
}

async function addItem(listName, itemName, updates) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (!item) {
            let category = lookupItemCategory(any, list.identifier, itemName);
            let newItem = any.createItem({name: itemName, categoryMatchId: category});
            populateItemUpdates(newItem, updates);
            newItem.checked = false;
            await list.addItem(newItem);
            return 200;
        } else if (item.checked) {
            populateItemUpdates(item, updates);
            item.checked = false;
            await item.save();
            return 200;
        } else {
            return 304;
        }
    });
}

async function updateItem(listName, itemId, updates) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemById(itemId);
        if (!item) {
            return 400;
        }

        populateItemUpdates(item, updates);
        await item.save();
        return 200;
    });
}

async function checkItem(listName, itemName, checked) {
    return initialize(async (any) => {
        let list = getListByName(any, listName);
        if (!list) {
            return 400;
        }

        let item = list.getItemByName(itemName);
        if (!item) {
            return 400;
        }

        if (item.checked == checked) {
            return 304;
        }

        item.checked = checked;
        await item.save();
        return 200;
    });
}

async function getRecipeCollections() {
    return initialize(async (any) => {
        const userData = await any._getUserData();
        const collections = userData.recipeDataResponse?.recipeCollections || [];
        
        return collections.map(collection => ({
            id: collection.identifier,
            name: collection.name,
            recipeIds: collection.recipeIds || []
        }));
    });
}

async function getRecipes(collection) {
    return initialize(async (any) => {
        await any.getRecipes();
        let recipes = any.recipes || [];
        
        // Filter by collection if specified
        if (collection) {
            try {
                // Get collections within the same initialized context
                const userData = await any._getUserData();
                const collections = userData.recipeDataResponse?.recipeCollections || [];
                
                const targetCollection = collections.find(c => 
                    c.name.toLowerCase() === collection.toLowerCase()
                );
                
                if (targetCollection) {
                    // Filter recipes to only include those in the specified collection
                    const collectionRecipeIds = targetCollection.recipeIds || [];
                    recipes = recipes.filter(recipe => 
                        collectionRecipeIds.includes(recipe.identifier)
                    );
                }
                // If collection not found, return empty array
                else {
                    recipes = [];
                }
            } catch (error) {
                console.error('Error filtering by collection:', error);
                // If collection filtering fails, return all recipes to maintain compatibility
            }
        }
        
        return recipes.map(recipe => {
            return {
                id: recipe.identifier,
                name: recipe.name,
                note: recipe.note,
                sourceName: recipe.sourceName,
                sourceUrl: recipe.sourceUrl,
                ingredients: recipe.ingredients.map(ing => ({
                    name: ing.name,
                    quantity: ing.quantity,
                    unit: ing.unit
                })),
                preparationSteps: recipe.preparationSteps || [],
                photoUrls: recipe.photoUrls || [],
                cookTime: recipe.cookTime,
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                rating: recipe.rating,
                nutritionalInfo: recipe.nutritionalInfo,
                creationTimestamp: recipe.creationTimestamp
            };
        });
    });
}

async function getRecipeById(recipeId) {
    return initialize(async (any) => {
        await any.getRecipes();
        let recipe = any.recipes.find(r => r.identifier === recipeId);
        
        if (!recipe) {
            return null;
        }
        
        return {
            id: recipe.identifier,
            name: recipe.name,
            note: recipe.note,
            sourceName: recipe.sourceName,
            sourceUrl: recipe.sourceUrl,
            ingredients: recipe.ingredients.map(ing => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: ing.unit
            })),
            preparationSteps: recipe.preparationSteps || [],
            photoUrls: recipe.photoUrls || [],
            cookTime: recipe.cookTime,
            prepTime: recipe.prepTime,
            servings: recipe.servings,
            rating: recipe.rating,
            nutritionalInfo: recipe.nutritionalInfo,
            creationTimestamp: recipe.creationTimestamp
        };
    });
}

async function createRecipe(recipeData) {
    return initialize(async (any) => {
        try {
            let recipe = await any.createRecipe({
                name: recipeData.name,
                note: recipeData.note,
                sourceName: recipeData.sourceName,
                sourceUrl: recipeData.sourceUrl,
                preparationSteps: recipeData.preparationSteps || [],
                cookTime: recipeData.cookTime,
                prepTime: recipeData.prepTime,
                servings: recipeData.servings,
                rating: recipeData.rating,
                nutritionalInfo: recipeData.nutritionalInfo
            });
            
            // Add ingredients if provided
            if (recipeData.ingredients && Array.isArray(recipeData.ingredients)) {
                recipe.ingredients = await Promise.all(
                    recipeData.ingredients.map(ing => 
                        any.createItem({
                            name: ing.name,
                            quantity: ing.quantity,
                            unit: ing.unit
                        })
                    )
                );
            }
            
            await recipe.save();
            return { success: true, id: recipe.identifier };
        } catch (error) {
            console.error('Error creating recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function updateRecipe(recipeId, updates) {
    return initialize(async (any) => {
        try {
            await any.getRecipes();
            let recipe = any.recipes.find(r => r.identifier === recipeId);
            
            if (!recipe) {
                return { success: false, error: 'Recipe not found' };
            }
            
            // Update recipe properties
            if ('name' in updates) recipe.name = updates.name;
            if ('note' in updates) recipe.note = updates.note;
            if ('sourceName' in updates) recipe.sourceName = updates.sourceName;
            if ('sourceUrl' in updates) recipe.sourceUrl = updates.sourceUrl;
            if ('preparationSteps' in updates) recipe.preparationSteps = updates.preparationSteps;
            if ('cookTime' in updates) recipe.cookTime = updates.cookTime;
            if ('prepTime' in updates) recipe.prepTime = updates.prepTime;
            if ('servings' in updates) recipe.servings = updates.servings;
            if ('rating' in updates) recipe.rating = updates.rating;
            if ('nutritionalInfo' in updates) recipe.nutritionalInfo = updates.nutritionalInfo;
            
            // Update ingredients if provided
            if ('ingredients' in updates && Array.isArray(updates.ingredients)) {
                // Clear old ingredients
                recipe.ingredients = [];
                
                // Create and await new ingredients
                const newIngredients = await Promise.all(
                    updates.ingredients.map(ing => 
                        any.createItem({
                            name: ing.name,
                            quantity: ing.quantity,
                            unit: ing.unit
                        })
                    )
                );
                
                // Assign resolved ingredients
                recipe.ingredients = newIngredients;
            }
            
            await recipe.save();
            return { success: true, id: recipe.identifier };
        } catch (error) {
            console.error('Error updating recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function deleteRecipe(recipeId) {
    return initialize(async (any) => {
        try {
            await any.getRecipes();
            let recipe = any.recipes.find(r => r.identifier === recipeId);
            
            if (!recipe) {
                return { success: false, error: 'Recipe not found' };
            }
            
            await recipe.delete();
            return { success: true };
        } catch (error) {
            console.error('Error deleting recipe:', error);
            return { success: false, error: error.message };
        }
    });
}

async function addToMealPlan(recipeId, date, mealType) {
    return initialize(async (any) => {
        try {
            let event = await any.createEvent({
                recipeId: recipeId,
                date: new Date(date),
                title: mealType || 'Meal'
            });
            
            await event.save();
            return { success: true, eventId: event.identifier };
        } catch (error) {
            console.error('Error adding to meal plan:', error);
            return { success: false, error: error.message };
        }
    });
}

function getListName(list) {
    return list || DEFAULT_LIST;
}

function enforceRequestSource(req, res) {
    if (!IP_FILTER) {
        return true;
    }

    let ip = req.socket.remoteAddress
    if (ip.startsWith(IP_FILTER)) {
        return true;
    }

    res.sendStatus(403);
    return false;
}

const app = express();
app.use(express.json());

app.get("/lists", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let lists = await getLists();
    let response = {
        lists: lists
    };

    res.status(200);
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(response));
});

app.get("/items", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.query.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let items = await getItems(listName);
    if (items == null) {
        res.sendStatus(500);
        return;
    }

    let response = {
        items: items
    };

    res.status(200);
    res.header("Content-Type", "application/json");
    res.send(JSON.stringify(response));
});

app.post("/add", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let item = req.body.name;
    if (!item) {
        res.sendStatus(400);
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let code = await addItem(listName, item, req.body);
    res.sendStatus(code);
});

app.post("/remove", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    if (req.body.name) {
        let code = await removeItemByName(listName, req.body.name);
        res.sendStatus(code);
    } else if (req.body.id) {
        let code = await removeItemById(listName, req.body.id);
        res.sendStatus(code);
    } else {
        res.sendStatus(400);
    }
});

app.post("/update", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let itemId = req.body.id;
    if (!itemId) {
        res.sendStatus(400);
        return;
    }

    let code = await updateItem(listName, itemId, req.body);
    res.sendStatus(code);
});

app.post("/check", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    let listName = getListName(req.body.list);
    if (!listName) {
        res.sendStatus(400);
        return;
    }

    let itemName = req.body.name;
    if (!itemName) {
        res.sendStatus(400);
        return;
    }

    let checked = req.body.checked;
    if (checked === undefined) {
        res.sendStatus(400);
        return;
    }

    let code = await checkItem(listName, itemName, checked);
    res.sendStatus(code);
});

// Recipe endpoints

app.get("/recipes", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let collection = req.query.collection;
        let recipes = await getRecipes(collection);
        
        let response = {
            recipes: recipes
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(response));
    } catch (error) {
        console.error('Error fetching recipes:', error);
        res.sendStatus(500);
    }
});

app.get("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId) {
            res.sendStatus(400);
            return;
        }

        let recipe = await getRecipeById(recipeId);
        if (!recipe) {
            res.sendStatus(404);
            return;
        }

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(recipe));
    } catch (error) {
        console.error('Error fetching recipe:', error);
        res.sendStatus(500);
    }
});

app.post("/recipes", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeData = req.body;
        if (!recipeData.name) {
            res.sendStatus(400);
            return;
        }

        let result = await createRecipe(recipeData);
        if (result.success) {
            res.status(201);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ id: result.id }));
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error creating recipe:', error);
        res.sendStatus(500);
    }
});

app.put("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId) {
            res.sendStatus(400);
            return;
        }

        let updates = req.body;
        let result = await updateRecipe(recipeId, updates);
        
        if (result.success) {
            res.status(200);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ id: result.id }));
        } else if (result.error === 'Recipe not found') {
            res.sendStatus(404);
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        res.sendStatus(500);
    }
});

app.delete("/recipes/:id", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let recipeId = req.params.id;
        if (!recipeId) {
            res.sendStatus(400);
            return;
        }

        let result = await deleteRecipe(recipeId);
        
        if (result.success) {
            res.sendStatus(200);
        } else if (result.error === 'Recipe not found') {
            res.sendStatus(404);
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error deleting recipe:', error);
        res.sendStatus(500);
    }
});

app.get("/recipe-collections", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let collections = await getRecipeCollections();
        let response = {
            collections: collections
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(JSON.stringify(response));
    } catch (error) {
        console.error('Error fetching recipe collections:', error);
        res.sendStatus(500);
    }
});

app.post("/meal-plan", async (req, res) => {
    if (!enforceRequestSource(req, res)) {
        return;
    }

    try {
        let { recipeId, date, mealType } = req.body;
        
        if (!recipeId || !date) {
            res.sendStatus(400);
            return;
        }

        let result = await addToMealPlan(recipeId, date, mealType);
        
        if (result.success) {
            res.status(201);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ eventId: result.eventId }));
        } else {
            res.status(400);
            res.header("Content-Type", "application/json");
            res.send(JSON.stringify({ error: result.error }));
        }
    } catch (error) {
        console.error('Error adding to meal plan:', error);
        res.sendStatus(500);
    }
});

function start() {
    if (!EMAIL || !PASSWORD) {
        console.error("Missing username or password");
        return;
    }

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`Server port: ${PORT}`);

        if (IP_FILTER) {
            console.log(`IP filter: ${IP_FILTER}`);
        }

        if (DEFAULT_LIST) {
            console.log(`Default list: ${DEFAULT_LIST}`);
        }

        if (CREDENTIALS_FILE) {
            console.log(`Credentials file: ${CREDENTIALS_FILE}`);
        }
    });
}

// Export the app for testing
module.exports = app;

// Only start the server if this file is run directly (not imported for testing)
if (require.main === module) {
    start();
}
