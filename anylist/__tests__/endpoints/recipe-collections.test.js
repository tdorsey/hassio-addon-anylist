const request = require('supertest');

describe('GET /recipe-collections', () => {
    let app;

    beforeAll(() => {
        app = require('../../index.js');
    });

    test('should return all recipe collections', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        expect(response.body).toHaveProperty('collections');
        expect(Array.isArray(response.body.collections)).toBe(true);
        expect(response.body.collections).toHaveLength(2);
        
        const collection = response.body.collections[0];
        expect(collection).toHaveProperty('id');
        expect(collection).toHaveProperty('name');
        expect(collection).toHaveProperty('recipeIds');
        expect(Array.isArray(collection.recipeIds)).toBe(true);
    });

    test('should include expected collection names', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        const collectionNames = response.body.collections.map(c => c.name);
        expect(collectionNames).toContain('Desserts');
        expect(collectionNames).toContain('Main Dishes');
    });

    test('should handle AnyList API errors gracefully', async () => {
        global.testUtils.simulateApiState('apiError');

        await request(app)
            .get('/recipe-collections')
            .expect(500);
    });

    test('should handle collection access errors', async () => {
        global.testUtils.simulateApiState('collectionError');

        await request(app)
            .get('/recipe-collections')
            .expect(500);
    });

    test('should return collections data structure properly', async () => {
        const response = await request(app)
            .get('/recipe-collections')
            .expect(200);

        expect(response.body).toHaveProperty('collections');
        expect(Array.isArray(response.body.collections)).toBe(true);
        
        // Each collection should have the proper structure
        response.body.collections.forEach(collection => {
            expect(collection).toHaveProperty('id');
            expect(collection).toHaveProperty('name');
            expect(collection).toHaveProperty('recipeIds');
            expect(Array.isArray(collection.recipeIds)).toBe(true);
        });
    });
});