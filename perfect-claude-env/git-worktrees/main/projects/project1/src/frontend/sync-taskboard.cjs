const fs = require('fs');
const path = require('path');

// Copy the real task board to the public API directory
const sourceFile = path.join(__dirname, '../../../../coordination/task-board.json');
const targetFile = path.join(__dirname, 'public/api/task-board.json');

try {
  if (fs.existsSync(sourceFile)) {
    const taskBoardData = fs.readFileSync(sourceFile, 'utf8');
    const taskBoard = JSON.parse(taskBoardData);
    
    // Create a simplified version for the frontend
    const frontendData = {
      version: taskBoard.version,
      lastUpdated: taskBoard.lastUpdated,
      agents: taskBoard.agents,
      metrics: taskBoard.metrics || {
        totalTasks: taskBoard.tasks?.length || 0,
        completedTasks: taskBoard.tasks?.filter(t => t.status === 'DONE' || t.status === 'VERIFIED').length || 0,
        inProgressTasks: taskBoard.tasks?.filter(t => t.status === 'IN_PROGRESS').length || 0,
        targetCoverage: 95,
        currentCoverage: taskBoard.metrics?.currentCoverage || 0
      }
    };
    
    fs.writeFileSync(targetFile, JSON.stringify(frontendData, null, 2));
    console.log('✅ Synced real task board data to frontend');
  } else {
    console.warn('⚠️ Real task board not found, keeping existing data');
  }
} catch (error) {
  console.error('❌ Failed to sync task board:', error);
}