/*
 * Rental Agreements Routes
 * Handles storage and retrieval of rental agreement PDFs in Azure Blob Storage
 * 
 * Copyright (c) 2025 Alexander Orlov.
 * Aegis AO Soft
 */

const express = require('express');
const router = express.Router();
const { BlobServiceClient } = require('@azure/storage-blob');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');

// Multer configuration for PDF uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Container name for agreements
const CONTAINER_NAME = 'agreements';

// Get blob service client
const getBlobServiceClient = () => {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  
  if (!connectionString) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING is not configured');
  }
  
  return BlobServiceClient.fromConnectionString(connectionString);
};

// Ensure container exists
const ensureContainerExists = async (containerClient) => {
  try {
    await containerClient.createIfNotExists({
      access: 'blob' // Public read access for blobs
    });
  } catch (error) {
    console.error('[Agreements] Error creating container:', error);
    throw error;
  }
};

// Generate blob name for agreement
const generateBlobName = (bookingId, companyId) => {
  const date = new Date().toISOString().split('T')[0];
  return `${companyId || 'default'}/${date}/agreement-${bookingId}.pdf`;
};

/**
 * POST /api/agreements/:bookingId
 * Upload rental agreement PDF to Azure Blob Storage
 */
router.post('/:bookingId', authenticateToken, upload.single('pdf'), async (req, res) => {
  const { bookingId } = req.params;
  const companyId = req.body.companyId || req.query.companyId;
  
  console.log(`[Agreements] Uploading agreement PDF for booking ${bookingId}`);
  
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No PDF file provided' 
      });
    }
    
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Ensure container exists
    await ensureContainerExists(containerClient);
    
    // Generate blob name
    const blobName = generateBlobName(bookingId, companyId);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    // Upload PDF
    await blockBlobClient.uploadData(req.file.buffer, {
      blobHTTPHeaders: {
        blobContentType: 'application/pdf',
        blobContentDisposition: `inline; filename="rental-agreement-${bookingId}.pdf"`
      },
      metadata: {
        bookingId: bookingId.toString(),
        companyId: companyId?.toString() || '',
        uploadedAt: new Date().toISOString()
      }
    });
    
    // Get the URL
    const url = blockBlobClient.url;
    
    console.log(`[Agreements] Successfully uploaded agreement for booking ${bookingId}: ${url}`);
    
    res.json({
      success: true,
      message: 'Agreement PDF uploaded successfully',
      url: url,
      blobName: blobName
    });
    
  } catch (error) {
    console.error(`[Agreements] Error uploading agreement for booking ${bookingId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to upload agreement PDF' 
    });
  }
});

/**
 * GET /api/agreements/:bookingId
 * Get rental agreement PDF URL from Azure Blob Storage
 */
router.get('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const companyId = req.query.companyId;
  
  console.log(`[Agreements] Fetching agreement PDF for booking ${bookingId}`);
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Search for the agreement blob
    // Since we might not know the exact date, we need to search
    let foundBlob = null;
    
    // First, try to find by prefix (company/date pattern)
    const prefix = companyId ? `${companyId}/` : '';
    
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
        foundBlob = blob;
        break;
      }
    }
    
    // If not found with company prefix, search all
    if (!foundBlob) {
      for await (const blob of containerClient.listBlobsFlat()) {
        if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
          foundBlob = blob;
          break;
        }
      }
    }
    
    if (!foundBlob) {
      return res.status(404).json({
        success: false,
        message: 'Agreement PDF not found'
      });
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(foundBlob.name);
    const url = blockBlobClient.url;
    
    console.log(`[Agreements] Found agreement for booking ${bookingId}: ${url}`);
    
    res.json({
      success: true,
      url: url,
      blobName: foundBlob.name,
      metadata: foundBlob.metadata
    });
    
  } catch (error) {
    console.error(`[Agreements] Error fetching agreement for booking ${bookingId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to fetch agreement PDF' 
    });
  }
});

/**
 * GET /api/agreements/:bookingId/download
 * Download rental agreement PDF from Azure Blob Storage
 */
router.get('/:bookingId/download', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const companyId = req.query.companyId;
  
  console.log(`[Agreements] Downloading agreement PDF for booking ${bookingId}`);
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Search for the agreement blob
    let foundBlob = null;
    const prefix = companyId ? `${companyId}/` : '';
    
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
        foundBlob = blob;
        break;
      }
    }
    
    if (!foundBlob) {
      for await (const blob of containerClient.listBlobsFlat()) {
        if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
          foundBlob = blob;
          break;
        }
      }
    }
    
    if (!foundBlob) {
      return res.status(404).json({
        success: false,
        message: 'Agreement PDF not found'
      });
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(foundBlob.name);
    
    // Download the blob
    const downloadResponse = await blockBlobClient.download(0);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rental-agreement-${bookingId}.pdf"`);
    
    // Stream the blob to response
    downloadResponse.readableStreamBody.pipe(res);
    
  } catch (error) {
    console.error(`[Agreements] Error downloading agreement for booking ${bookingId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to download agreement PDF' 
    });
  }
});

/**
 * DELETE /api/agreements/:bookingId
 * Delete rental agreement PDF from Azure Blob Storage
 */
router.delete('/:bookingId', authenticateToken, async (req, res) => {
  const { bookingId } = req.params;
  const companyId = req.query.companyId;
  
  console.log(`[Agreements] Deleting agreement PDF for booking ${bookingId}`);
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    // Search for the agreement blob
    let foundBlob = null;
    const prefix = companyId ? `${companyId}/` : '';
    
    for await (const blob of containerClient.listBlobsFlat({ prefix })) {
      if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
        foundBlob = blob;
        break;
      }
    }
    
    if (!foundBlob) {
      for await (const blob of containerClient.listBlobsFlat()) {
        if (blob.name.includes(`agreement-${bookingId}.pdf`)) {
          foundBlob = blob;
          break;
        }
      }
    }
    
    if (!foundBlob) {
      return res.status(404).json({
        success: false,
        message: 'Agreement PDF not found'
      });
    }
    
    const blockBlobClient = containerClient.getBlockBlobClient(foundBlob.name);
    await blockBlobClient.delete();
    
    console.log(`[Agreements] Deleted agreement for booking ${bookingId}`);
    
    res.json({
      success: true,
      message: 'Agreement PDF deleted successfully'
    });
    
  } catch (error) {
    console.error(`[Agreements] Error deleting agreement for booking ${bookingId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete agreement PDF' 
    });
  }
});

/**
 * GET /api/agreements/company/:companyId
 * List all agreements for a company
 */
router.get('/company/:companyId', authenticateToken, async (req, res) => {
  const { companyId } = req.params;
  
  console.log(`[Agreements] Listing agreements for company ${companyId}`);
  
  try {
    const blobServiceClient = getBlobServiceClient();
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    
    const agreements = [];
    const prefix = `${companyId}/`;
    
    for await (const blob of containerClient.listBlobsFlat({ prefix, includeMetadata: true })) {
      // Extract booking ID from blob name
      const match = blob.name.match(/agreement-(\d+)\.pdf$/);
      const bookingId = match ? match[1] : null;
      
      agreements.push({
        blobName: blob.name,
        bookingId: bookingId,
        url: containerClient.getBlockBlobClient(blob.name).url,
        createdOn: blob.properties.createdOn,
        metadata: blob.metadata
      });
    }
    
    res.json({
      success: true,
      count: agreements.length,
      agreements: agreements
    });
    
  } catch (error) {
    console.error(`[Agreements] Error listing agreements for company ${companyId}:`, error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to list agreements' 
    });
  }
});

module.exports = router;
