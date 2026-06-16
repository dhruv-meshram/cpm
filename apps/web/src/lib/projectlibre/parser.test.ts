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

  it('should parse our custom CPMProject XML structure successfully', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <CPMProject>
      <ProjectInfo>
        <ID>proj-123</ID>
        <Name>Test Custom Project</Name>
      </ProjectInfo>
      <Tasks>
        <Task>
          <ID>task-1</ID>
          <Title>First Task</Title>
          <Description>First task description</Description>
          <Duration>5</Duration>
          <StartDate>2026-04-06T13:00:00Z</StartDate>
          <EndDate>2026-04-11T13:00:00Z</EndDate>
          <State>TODO</State>
          <ParentID></ParentID>
          <IsCritical>true</IsCritical>
        </Task>
        <Task>
          <ID>task-2</ID>
          <Title>Second Task</Title>
          <Description>Second task description</Description>
          <Duration>0</Duration>
          <StartDate>2026-04-11T13:00:00Z</StartDate>
          <EndDate>2026-04-11T13:00:00Z</EndDate>
          <State>TODO</State>
          <ParentID>task-1</ParentID>
          <IsCritical>false</IsCritical>
        </Task>
      </Tasks>
      <Dependencies>
        <Dependency>
          <PredecessorID>task-1</PredecessorID>
          <SuccessorID>task-2</SuccessorID>
          <Type>FS</Type>
          <Lag>0</Lag>
        </Dependency>
      </Dependencies>
    </CPMProject>`;

    const parsed = parseProjectLibreXML(xml);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.isCpmProject).toBe(true);
    expect(parsed.data?.cpmTasks?.length).toBe(2);

    const result = transformProjectLibreData(parsed.data!);
    expect(result.tasks.length).toBe(2);
    
    // First Task checks
    const t1 = result.tasks.find(t => t.id === 'task-1');
    expect(t1).toBeDefined();
    expect(t1?.name).toBe('First Task');
    expect(t1?.isSummary).toBe(true); // Since task-2 has it as parent
    expect(t1?.isMilestone).toBe(false);
    expect(t1?.isCritical).toBe(true);
    expect(t1?.durationHours).toBe(120);

    // Second Task checks
    const t2 = result.tasks.find(t => t.id === 'task-2');
    expect(t2).toBeDefined();
    expect(t2?.name).toBe('Second Task');
    expect(t2?.parentId).toBe('task-1');
    expect(t2?.isMilestone).toBe(true);
    expect(t2?.dependencies.length).toBe(1);
    expect(t2?.dependencies[0].predecessorId).toBe('task-1');
    expect(t2?.dependencies[0].type).toBe(1); // FS -> 1
  });

  it('should ignore duration tag and calculate duration from start and finish dates, adjusting to midnight', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
    <Project>
      <Tasks>
        <Task>
          <UID>1</UID>
          <Name>Custom Duration Task</Name>
          <OutlineLevel>1</OutlineLevel>
          <Summary>0</Summary>
          <Milestone>0</Milestone>
          <Start>2026-04-06T13:00:00</Start>
          <Finish>2026-04-10T14:00:00</Finish>
          <Duration>PT5H0M0S</Duration>
        </Task>
      </Tasks>
    </Project>`;

    const parsed = parseProjectLibreXML(xml);
    expect(parsed.success).toBe(true);

    const result = transformProjectLibreData(parsed.data!);
    expect(result.tasks.length).toBe(1);

    const task = result.tasks[0];
    expect(task.name).toBe('Custom Duration Task');
    expect(task.start).toBe('2026-04-06T00:00:00');
    expect(task.finish).toBe('2026-04-10T00:00:00');
    // Difference is 4 days -> 4 * 24 = 96 hours
    expect(task.durationHours).toBe(96);
  });

  it('integration test: should parse the real new-cpm.xml', () => {
    const filePath = path.join(process.cwd(), 'new-cpm.xml');
    if (!fs.existsSync(filePath)) {
      console.log("new-cpm.xml file not found, skipping integration test");
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const parsed = parseProjectLibreXML(content);
    expect(parsed.success).toBe(true);

    if (parsed.success && parsed.data) {
      const result = transformProjectLibreData(parsed.data);
      expect(result.metrics.totalDiscovered).toBeGreaterThan(0);
      expect(result.tasks.length).toBeGreaterThan(0);
      
      const t1 = result.tasks.find(t => t.name === 'procurement of OEMs');
      expect(t1).toBeDefined();
      expect(t1?.isCritical).toBe(false);
      expect(t1?.durationHours).toBe(29 * 24);
    }
  });
});
