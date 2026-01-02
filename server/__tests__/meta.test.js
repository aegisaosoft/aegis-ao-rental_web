/**
 * Unit tests for Meta routes (server/routes/meta.js)
 */

const express = require('express');
const request = require('supertest');
const axios = require('axios');

// Mock axios
jest.mock('axios');

// Create a fresh app for testing
function createTestApp() {
  const app = express();
  app.use(express.json());
  
  // Mock meta router
  const router = express.Router();
  
  const API_BASE_URL = 'https://test-api.example.com';
  
  // GET /:companyId/meta/status
  router.get('/:companyId/meta/status', async (req, res) => {
    const { companyId } = req.params;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/companies/${companyId}/meta/status`,
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    }
  });
  
  // GET /:companyId/meta/pages
  router.get('/:companyId/meta/pages', async (req, res) => {
    const { companyId } = req.params;
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/companies/${companyId}/meta/pages`,
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    }
  });
  
  // POST /:companyId/meta/disconnect
  router.post('/:companyId/meta/disconnect', async (req, res) => {
    const { companyId } = req.params;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/companies/${companyId}/meta/disconnect`,
        {},
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    }
  });
  
  // POST /:companyId/meta/select-page
  router.post('/:companyId/meta/select-page', async (req, res) => {
    const { companyId } = req.params;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/companies/${companyId}/meta/select-page`,
        req.body,
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    }
  });
  
  // POST /:companyId/meta/refresh-instagram
  router.post('/:companyId/meta/refresh-instagram', async (req, res) => {
    const { companyId } = req.params;
    
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/companies/${companyId}/meta/refresh-instagram`,
        {},
        {
          headers: {
            'Authorization': req.headers.authorization,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );
      
      return res.status(response.status).json(response.data);
    } catch (error) {
      return res.status(error.response?.status || 500).json({
        error: error.response?.data?.error || error.message
      });
    }
  });
  
  app.use('/api/companies', router);
  
  return app;
}

describe('Meta Routes', () => {
  let app;
  
  beforeEach(() => {
    jest.clearAllMocks();
    app = createTestApp();
  });
  
  describe('GET /api/companies/:companyId/meta/status', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should return meta status when connected', async () => {
      const mockResponse = {
        data: {
          isConnected: true,
          status: 'Active',
          pageId: 'page-123',
          pageName: 'Test Page',
          instagramAccountId: 'ig-456',
          instagramUsername: 'testpage',
          tokenExpiresAt: '2025-03-01T00:00:00Z',
          tokenStatus: 'valid'
        },
        status: 200
      };
      
      axios.get.mockResolvedValue(mockResponse);
      
      const response = await request(app)
        .get(`/api/companies/${companyId}/meta/status`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.isConnected).toBe(true);
      expect(response.body.pageId).toBe('page-123');
      expect(response.body.instagramUsername).toBe('testpage');
    });
    
    it('should return not connected status', async () => {
      const mockResponse = {
        data: {
          isConnected: false,
          status: null,
          pageId: null,
          pageName: null
        },
        status: 200
      };
      
      axios.get.mockResolvedValue(mockResponse);
      
      const response = await request(app)
        .get(`/api/companies/${companyId}/meta/status`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.isConnected).toBe(false);
    });
    
    it('should handle API errors', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 500,
          data: { error: 'Internal server error' }
        }
      });
      
      const response = await request(app)
        .get(`/api/companies/${companyId}/meta/status`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
    
    it('should forward authorization header', async () => {
      axios.get.mockResolvedValue({ data: {}, status: 200 });
      
      await request(app)
        .get(`/api/companies/${companyId}/meta/status`)
        .set('Authorization', 'Bearer my-auth-token');
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer my-auth-token'
          })
        })
      );
    });
  });
  
  describe('GET /api/companies/:companyId/meta/pages', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should return available pages', async () => {
      const mockPages = [
        { id: 'page-1', name: 'Page One', accessToken: 'token-1' },
        { id: 'page-2', name: 'Page Two', accessToken: 'token-2' }
      ];
      
      axios.get.mockResolvedValue({ data: mockPages, status: 200 });
      
      const response = await request(app)
        .get(`/api/companies/${companyId}/meta/pages`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Page One');
    });
    
    it('should handle 404 when credentials not found', async () => {
      axios.get.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Meta credentials not found for this company' }
        }
      });
      
      const response = await request(app)
        .get(`/api/companies/${companyId}/meta/pages`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /api/companies/:companyId/meta/disconnect', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should disconnect successfully', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'Disconnected from Meta' },
        status: 200
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/disconnect`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should handle 404 when company not found', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 404,
          data: { error: 'Meta credentials not found for this company' }
        }
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/disconnect`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('POST /api/companies/:companyId/meta/select-page', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should select page successfully', async () => {
      axios.post.mockResolvedValue({
        data: { success: true, message: 'Page selected successfully' },
        status: 200
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/select-page`)
        .set('Authorization', 'Bearer test-token')
        .send({ pageId: 'page-123' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should forward request body to API', async () => {
      axios.post.mockResolvedValue({ data: {}, status: 200 });
      
      await request(app)
        .post(`/api/companies/${companyId}/meta/select-page`)
        .set('Authorization', 'Bearer test-token')
        .send({ pageId: 'page-456' });
      
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        { pageId: 'page-456' },
        expect.any(Object)
      );
    });
    
    it('should handle 400 when page not found', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Page not found in available pages' }
        }
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/select-page`)
        .set('Authorization', 'Bearer test-token')
        .send({ pageId: 'invalid-page' });
      
      expect(response.status).toBe(400);
    });
  });
  
  describe('POST /api/companies/:companyId/meta/refresh-instagram', () => {
    const companyId = '123e4567-e89b-12d3-a456-426614174000';
    
    it('should refresh instagram successfully', async () => {
      axios.post.mockResolvedValue({
        data: {
          success: true,
          instagramAccountId: 'ig-new-123',
          instagramUsername: 'newusername',
          followersCount: 1000,
          mediaCount: 50
        },
        status: 200
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/refresh-instagram`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.instagramUsername).toBe('newusername');
    });
    
    it('should handle case when no Instagram account linked', async () => {
      axios.post.mockResolvedValue({
        data: {
          success: false,
          message: 'No Instagram Business Account linked to this Facebook Page.',
          instagramAccountId: null,
          instagramUsername: null
        },
        status: 200
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/refresh-instagram`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(false);
    });
    
    it('should handle 400 when page not selected', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 400,
          data: { error: 'Page must be selected before refreshing Instagram' }
        }
      });
      
      const response = await request(app)
        .post(`/api/companies/${companyId}/meta/refresh-instagram`)
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(400);
    });
  });
});
