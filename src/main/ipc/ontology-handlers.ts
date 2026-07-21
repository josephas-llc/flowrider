/**
 * ZOIX Ontology Builder IPC Handlers
 *
 * Exposes ontology building and management functionality to the renderer
 */

import { ipcMain } from 'electron';
import type { AICore } from '../ai-core';

export function registerOntologyHandlers(aiCore: AICore): void {
  // ========================================
  // Ontology Retrieval
  // ========================================

  /**
   * Get the full ontology tree
   */
  ipcMain.handle('zoix:getOntology', async () => {
    try {
      const data = aiCore.getOntology();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Get a specific branch of the ontology
   */
  ipcMain.handle('zoix:getOntologyBranch', async (_event, nodeId: string) => {
    try {
      const data = aiCore.getOntologyBranch(nodeId);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Export the ontology in different formats
   */
  ipcMain.handle('zoix:exportOntology', async (_event, format: 'json' | 'graph' = 'json') => {
    try {
      const data = aiCore.exportOntology(format);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================
  // Growth Tracking
  // ========================================

  /**
   * Get ontology growth over time
   */
  ipcMain.handle('zoix:getOntologyGrowth', async (_event, period?: 'day' | 'week' | 'month') => {
    try {
      // Convert period to time range
      const now = Date.now();
      const msMap = { day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000, month: 30 * 24 * 60 * 60 * 1000 };
      const ms = period ? msMap[period] : msMap.week;
      const range = { start: now - ms, end: now };

      const data = aiCore.getOntologyGrowth(range);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Get growth statistics
   */
  ipcMain.handle('zoix:getOntologyGrowthStats', async () => {
    try {
      const data = aiCore.getOntologyGrowthStats();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Create a snapshot of current ontology state
   */
  ipcMain.handle('zoix:createOntologySnapshot', async () => {
    try {
      const data = aiCore.createOntologySnapshot();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================
  // Gap Analysis
  // ========================================

  /**
   * Compare ontology to standard developer ontologies
   */
  ipcMain.handle('zoix:compareOntologyToStandard', async (
    _event,
    standard: 'standard-fullstack' | 'standard-frontend' | 'standard-backend' | 'standard-devops'
  ) => {
    try {
      const data = aiCore.compareOntologyToStandard(standard);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // ========================================
  // Node Management
  // ========================================

  /**
   * Add a new node to the ontology
   */
  ipcMain.handle('zoix:addOntologyNode', async (
    _event,
    name: string,
    type: 'root' | 'domain' | 'subdomain' | 'technology' | 'concept',
    parentId?: string,
    options?: { description?: string; tags?: string[]; sourceInteraction?: string }
  ) => {
    try {
      const data = aiCore.addOntologyNode(name, type, parentId, options);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Auto-organize a concept in the ontology
   */
  ipcMain.handle('zoix:autoOrganizeConcept', async (
    _event,
    conceptName: string,
    context?: { tags?: string[]; description?: string; sourceInteraction?: string }
  ) => {
    try {
      const data = aiCore.autoOrganizeConcept(conceptName, context);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Get a specific node by ID
   */
  ipcMain.handle('zoix:getOntologyNode', async (_event, id: string) => {
    try {
      const data = aiCore.getOntologyNode(id);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Find node by name
   */
  ipcMain.handle('zoix:findOntologyNodeByName', async (_event, name: string) => {
    try {
      const data = aiCore.findOntologyNodeByName(name);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Search ontology nodes
   */
  ipcMain.handle('zoix:searchOntology', async (_event, query: string) => {
    try {
      const data = aiCore.searchOntology(query);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  /**
   * Add a relation between two nodes
   */
  ipcMain.handle('zoix:addOntologyRelation', async (
    _event,
    fromId: string,
    toId: string,
    relationType: 'is-a' | 'uses' | 'competes-with' | 'complements' | 'depends-on',
    options?: { strength?: number; sourceInteraction?: string }
  ) => {
    try {
      const data = aiCore.addOntologyRelation(fromId, toId, relationType, options);
      return { success: true, data };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  console.log('[OntologyHandlers] Registered ZOIX Ontology Builder IPC handlers');
}
