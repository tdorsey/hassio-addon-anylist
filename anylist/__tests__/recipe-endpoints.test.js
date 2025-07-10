const request = require('supertest');
const AnyList = require('anylist');

// Mock the AnyList module before requiring the app
jest.mock('anylist');

// Mock data
const mockRecipes = [
    {
        identifier: 'recipe1',
        name: 'Test Recipe 1',
        note: 'A test recipe',
        sourceName: 'Test Source',
        sourceUrl: 'http://example.com',
        ingredients: [
            { name: 'Flour', quantity: '2', unit: 'cups' },
            { name: 'Sugar', quantity: '1', unit: 'cup' }
        ],
        preparationSteps: ['Mix ingredients', 'Bake at 350F'],
        photoUrls: ['http://example.com/photo.jpg'],
        cookTime: 30,
        prepTime: 15,
        servings: '4',
        rating: 5,
        nutritionalInfo: 'Calories: 200',
        creationTimestamp: 1234567890
    },
    {
        identifier: 'recipe2',
        name: 'Test Recipe 2',
        note: 'Another test recipe',
        sourceName: 'Test Source 2',
        sourceUrl: 'http://example2.com',
        ingredients: [
            { name: 'Chicken', quantity: '1', unit: 'lb' }
        ],
        preparationSteps: ['Cook chicken'],
        photoUrls: [],
        cookTime: 45,
        prepTime: 10,
        servings: '2',
        rating: 4,
        nutritionalInfo: 'Protein: 30g',
        creationTimestamp: 1234567891
    }
];

const mockCollections = [
    {
        identifier: 'collection1',
        name: 'Desserts',
        recipeIds: ['recipe1']
    },
    {
        identifier: 'collection2', 
        name: 'Main Dishes',
        recipeIds: ['recipe2']
    }
];

const mockAnyListInstance = {
    login: jest.fn().mockResolvedValue(true),
    getLists: jest.fn().mockResolvedValue([]),
    getRecipes: jest.fn().mockResolvedValue(true),
    recipes: mockRecipes,
    lists: [],
    _getUserData: jest.fn().mockResolvedValue({
        recipeDataResponse: {
            recipeCollections: mockCollections
        }
    }),
    createRecipe: jest.fn(),
    createEvent: jest.fn(),
    createItem: jest.fn()
};

// Mock AnyList constructor
AnyList.mockImplementation(() => mockAnyListInstance);

// Set environment variables for testing
process.env.EMAIL = 'test@example.com';
process.env.PASSWORD = 'testpassword';
// Disable IP filtering for tests
delete process.env.IP_FILTER;

// Mock console.log to avoid output during tests
console.log = jest.fn();
console.error = jest.fn();

describe('Recipe API Endpoints', () => {
    let app;

    beforeAll(() => {
        // Import app after setting up mocks and environment
        app = require('../index.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset recipes for each test
        mockAnyListInstance.recipes = [...mockRecipes];
    });

    describe('GET /recipes', () => {
        test('should return all recipes when no collection filter', async () => {
            const response = await request(app)
                .get('/recipes')
                .expect(200);

            expect(response.body).toHaveProperty('recipes');
            expect(response.body.recipes).toHaveLength(2);
            expect(response.body.recipes[0]).toHaveProperty('id', 'recipe1');
            expect(response.body.recipes[0]).toHaveProperty('name', 'Test Recipe 1');
            expect(response.body.recipes[0].ingredients).toHaveLength(2);
        });

        test('should filter recipes by collection', async () => {
            const response = await request(app)
                .get('/recipes?collection=Desserts')
                .expect(200);

            expect(response.body.recipes).toHaveLength(1);
            expect(response.body.recipes[0]).toHaveProperty('id', 'recipe1');
        });

        test('should return empty array for non-existent collection', async () => {
            const response = await request(app)
                .get('/recipes?collection=NonExistent')
                .expect(200);

            expect(response.body.recipes).toHaveLength(0);
        });

        test('should handle AnyList errors gracefully', async () => {
            mockAnyListInstance.getRecipes.mockRejectedValueOnce(new Error('AnyList error'));

            await request(app)
                .get('/recipes')
                .expect(500);
        });
    });

    describe('GET /recipes/:id', () => {
        test('should return specific recipe by ID', async () => {
            const response = await request(app)
                .get('/recipes/recipe1')
                .expect(200);

            expect(response.body).toHaveProperty('id', 'recipe1');
            expect(response.body).toHaveProperty('name', 'Test Recipe 1');
            expect(response.body.ingredients).toHaveLength(2);
        });

        test('should return 404 for non-existent recipe', async () => {
            await request(app)
                .get('/recipes/nonexistent')
                .expect(404);
        });

        test('should handle AnyList errors gracefully', async () => {
            mockAnyListInstance.getRecipes.mockRejectedValueOnce(new Error('AnyList error'));

            await request(app)
                .get('/recipes/recipe1')
                .expect(500);
        });
    });

    describe('POST /recipes', () => {
        test('should create new recipe successfully', async () => {
            const newRecipe = {
                name: 'New Test Recipe',
                note: 'A new recipe for testing',
                ingredients: [
                    { name: 'Test Ingredient', quantity: '1', unit: 'cup' }
                ],
                preparationSteps: ['Test step']
            };

            const mockCreatedRecipe = {
                identifier: 'new-recipe-id',
                ingredients: [],
                save: jest.fn().mockResolvedValue(true)
            };

            const mockIngredientItem = {
                name: 'Test Ingredient',
                quantity: '1',
                unit: 'cup'
            };

            mockAnyListInstance.createRecipe.mockResolvedValueOnce(mockCreatedRecipe);
            mockAnyListInstance.createItem.mockResolvedValueOnce(mockIngredientItem);

            const response = await request(app)
                .post('/recipes')
                .send(newRecipe)
                .expect(201);

            expect(response.body).toHaveProperty('id', 'new-recipe-id');
            expect(mockAnyListInstance.createRecipe).toHaveBeenCalledWith(expect.objectContaining({
                name: 'New Test Recipe'
            }));
            expect(mockAnyListInstance.createItem).toHaveBeenCalledWith(expect.objectContaining({
                name: 'Test Ingredient',
                quantity: '1',
                unit: 'cup'
            }));
        });

        test('should return 400 for missing recipe name', async () => {
            const invalidRecipe = {
                note: 'Missing name'
            };

            await request(app)
                .post('/recipes')
                .send(invalidRecipe)
                .expect(400);
        });

        test('should handle creation errors', async () => {
            const newRecipe = {
                name: 'Test Recipe'
            };

            mockAnyListInstance.createRecipe.mockRejectedValueOnce(new Error('Creation failed'));

            const response = await request(app)
                .post('/recipes')
                .send(newRecipe)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /recipes/:id', () => {
        test('should update existing recipe successfully', async () => {
            const updates = {
                name: 'Updated Recipe Name',
                note: 'Updated note'
            };

            const mockRecipe = {
                identifier: 'recipe1',
                name: 'Test Recipe 1',
                save: jest.fn().mockResolvedValue(true)
            };

            // Mock finding the recipe in the recipes array
            mockAnyListInstance.recipes = [mockRecipe];

            const response = await request(app)
                .put('/recipes/recipe1')
                .send(updates)
                .expect(200);

            expect(response.body).toHaveProperty('id', 'recipe1');
            expect(mockRecipe.save).toHaveBeenCalled();
        });

        test('should return 404 for non-existent recipe', async () => {
            mockAnyListInstance.recipes = [];

            await request(app)
                .put('/recipes/nonexistent')
                .send({ name: 'Test' })
                .expect(404);
        });
    });

    describe('DELETE /recipes/:id', () => {
        test('should delete existing recipe successfully', async () => {
            const mockRecipe = {
                identifier: 'recipe1',
                delete: jest.fn().mockResolvedValue(true)
            };

            mockAnyListInstance.recipes = [mockRecipe];

            await request(app)
                .delete('/recipes/recipe1')
                .expect(200);

            expect(mockRecipe.delete).toHaveBeenCalled();
        });

        test('should return 404 for non-existent recipe', async () => {
            mockAnyListInstance.recipes = [];

            await request(app)
                .delete('/recipes/nonexistent')
                .expect(404);
        });
    });

    describe('GET /recipe-collections', () => {
        test('should return all recipe collections', async () => {
            const response = await request(app)
                .get('/recipe-collections')
                .expect(200);

            expect(response.body).toHaveProperty('collections');
            expect(response.body.collections).toHaveLength(2);
            expect(response.body.collections[0]).toHaveProperty('id', 'collection1');
            expect(response.body.collections[0]).toHaveProperty('name', 'Desserts');
            expect(response.body.collections[0]).toHaveProperty('recipeIds');
        });

        test('should handle AnyList errors gracefully', async () => {
            mockAnyListInstance._getUserData.mockRejectedValueOnce(new Error('AnyList error'));

            await request(app)
                .get('/recipe-collections')
                .expect(500);
        });
    });

    describe('POST /meal-plan', () => {
        test('should add recipe to meal plan successfully', async () => {
            const mealPlanData = {
                recipeId: 'recipe1',
                date: '2023-12-01',
                mealType: 'dinner'
            };

            const mockEvent = {
                identifier: 'event-id',
                save: jest.fn().mockResolvedValue(true)
            };

            mockAnyListInstance.createEvent.mockResolvedValueOnce(mockEvent);

            const response = await request(app)
                .post('/meal-plan')
                .send(mealPlanData)
                .expect(201);

            expect(response.body).toHaveProperty('eventId', 'event-id');
            expect(mockAnyListInstance.createEvent).toHaveBeenCalledWith({
                recipeId: 'recipe1',
                date: new Date('2023-12-01'),
                title: 'dinner'
            });
        });

        test('should return 400 for missing recipeId', async () => {
            const invalidData = {
                date: '2023-12-01'
            };

            await request(app)
                .post('/meal-plan')
                .send(invalidData)
                .expect(400);
        });

        test('should return 400 for missing date', async () => {
            const invalidData = {
                recipeId: 'recipe1'
            };

            await request(app)
                .post('/meal-plan')
                .send(invalidData)
                .expect(400);
        });

        test('should handle meal planning errors', async () => {
            const mealPlanData = {
                recipeId: 'recipe1',
                date: '2023-12-01'
            };

            mockAnyListInstance.createEvent.mockRejectedValueOnce(new Error('Meal plan error'));

            const response = await request(app)
                .post('/meal-plan')
                .send(mealPlanData)
                .expect(400);

            expect(response.body).toHaveProperty('error');
        });
    });

    describe('Collection Filtering Integration', () => {
        test('should properly filter recipes using case-insensitive collection names', async () => {
            const response = await request(app)
                .get('/recipes?collection=desserts')
                .expect(200);

            expect(response.body.recipes).toHaveLength(1);
            expect(response.body.recipes[0]).toHaveProperty('id', 'recipe1');
        });

        test('should handle collection filtering errors gracefully', async () => {
            mockAnyListInstance._getUserData.mockImplementationOnce(() => {
                throw new Error('Collection access error');
            });

            // Should still return recipes when collection filtering fails
            const response = await request(app)
                .get('/recipes?collection=Desserts')
                .expect(200);

            expect(response.body.recipes).toHaveLength(2); // Returns all recipes as fallback
        });
    });
});