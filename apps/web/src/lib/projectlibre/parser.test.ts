import { describe, it, expect } from 'vitest';
import { parseProjectLibreXML, transformProjectLibreData } from './parser';
import * as fs from 'fs';
import * as path from 'path';

describe('ProjectLibre Parser & Transformer', () => {
  it('should parse basic XML successfully', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Project>
      <Tasks>
        <Task>
          <UID>1</UID>
          <Name>Moksha27</Name>
          <OutlineLevel>1</OutlineLevel>
          <Summary>1</Summary>
          <Milestone>0</Milestone>
          <Duration>PT10H0M0S</Duration>
        </Task>
        <Task>
          <UID>2</UID>
          <Name>Real Task</Name>
          <OutlineLevel>2</OutlineLevel>
          <Summary>0</Summary>
          <Milestone>0</Milestone>
          <Duration>PT5H0M0S</Duration>
        </Task>
      </Tasks>
    </Project>`;

    const parsed = parseProjectLibreXML(xml);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.Tasks.length).toBe(2);
  });

  it('should filter ignored nodes and hoist children', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Project>
      <Tasks>
        <Task>
          <UID>1</UID>
          <Name>Moksha27</Name>
          <OutlineLevel>1</OutlineLevel>
          <Summary>1</Summary>
          <Duration>PT10H0M0S</Duration>
        </Task>
        <Task>
          <UID>2</UID>
          <Name>Brakes</Name>
          <OutlineLevel>2</OutlineLevel>
          <Summary>1</Summary>
          <Duration>PT10H0M0S</Duration>
        </Task>
        <Task>
          <UID>3</UID>
          <Name>Brake Calcs</Name>
          <OutlineLevel>3</OutlineLevel>
          <Summary>0</Summary>
          <Duration>PT5H0M0S</Duration>
        </Task>
      </Tasks>
    </Project>`;

    const parsed = parseProjectLibreXML(xml);
    const result = transformProjectLibreData(parsed.data!);

    // Moksha27 and Brakes should be ignored
    expect(result.metrics.ignoredNodes).toContain('Moksha27');
    expect(result.metrics.ignoredNodes).toContain('Brakes');
    
    // Only Brake Calcs should be left, hoisted to top level
    expect(result.tasks.length).toBe(1);
    expect(result.tasks[0].name).toBe('Brake Calcs');
    expect(result.tasks[0].parentId).toBeUndefined();
  });

  it('integration test: should parse the real ebaja-cpm.xml', () => {
    // Read the real file from the root directory
    const filePath = path.join(process.cwd(), 'ebaja-cpm.xml');
    if (!fs.existsSync(filePath)) {
      console.log("File not found, skipping integration test");
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseProjectLibreXML(content);
    expect(parsed.success).toBe(true);

    if (parsed.success && parsed.data) {
      const result = transformProjectLibreData(parsed.data);
      expect(result.metrics.totalDiscovered).toBeGreaterThan(0);
      expect(result.metrics.ignoredNodes.length).toBeGreaterThan(0);
      expect(result.tasks.length).toBeGreaterThan(0);
      
      // Ensure 'Moksha27' is not in the imported tasks
      const mokshaNode = result.tasks.find(t => t.name === 'Moksha27' || t.name === "Moksha '27");
      expect(mokshaNode).toBeUndefined();
    }
  });
});
