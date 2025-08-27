/**
 * Node.js runner for the commitment metadata migration
 * This file handles the TypeScript compilation and execution
 */

const { execSync } = require('child_process');
const path = require('path');

function runMigration(command = 'dry-run') {
  try {
    console.log(`Running commitment metadata migration: ${command}`);
    
    // Compile and run the TypeScript migration script
    const scriptPath = path.join(__dirname, 'migrate-commitment-metadata.ts');
    const tsNodeCommand = `npx ts-node ${scriptPath} ${command}`;
    
    execSync(tsNodeCommand, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Get command from command line arguments
const command = process.argv[2] || 'dry-run';

// Validate command
const validCommands = ['dry-run', 'migrate', 'rollback'];
if (!validCommands.includes(command)) {
  console.error(`Invalid command: ${command}`);
  console.log('Valid commands: dry-run, migrate, rollback');
  process.exit(1);
}

runMigration(command);