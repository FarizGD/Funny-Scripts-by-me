// Import necessary modules for interactive input and child process execution.
const readline = require('readline');
const { spawn } = require('child_process');

// Create an interface for reading input from the console and writing output.
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    // This allows the cursor to move freely in the input line, useful for complex commands.
    terminal: true
});

/**
 * @function startShell
 * @description Initializes and runs the custom Node.js shell.
 * It continuously prompts the user for commands, executes them, and displays the output.
 */
function startShell() {
    // Set the prompt for the user, indicating readiness for a new command.
    rl.setPrompt('> ');
    // Display the prompt.
    rl.prompt();

    // Listen for 'line' events, which occur when the user presses Enter.
    rl.on('line', (line) => {
        // Trim whitespace from the beginning and end of the command.
        const command = line.trim();

        // Check for the 'exit' command to terminate the shell.
        if (command === 'exit') {
            console.log('Exiting Node.js shell. Goodbye!');
            rl.close(); // Close the readline interface.
            process.exit(0); // Terminate the Node.js process.
        }

        // If the command is empty, just prompt again.
        if (command === '') {
            rl.prompt();
            return;
        }

        // Split the command into the main executable and its arguments.
        // For example, "ls -l" becomes 'ls' and ['-l'].
        const [cmd, ...args] = command.split(' ');

        // Spawn a child process to execute the command.
        // 'inherit' option makes the child process's stdio streams (input, output, error)
        // directly inherit from the parent Node.js process, making it behave like a real shell.
        const child = spawn(cmd, args, { stdio: 'inherit' });

        // Listen for 'error' events, which occur if the command cannot be found or executed.
        child.on('error', (err) => {
            console.error(`Error executing command: ${err.message}`);
            rl.prompt(); // Prompt again after an error.
        });

        // Listen for the 'close' event, which occurs when the child process has exited.
        child.on('close', (code) => {
            if (code !== 0) {
                // If the process exited with a non-zero code, it means an error occurred in the command.
                console.error(`Command "${command}" exited with code ${code}`);
            }
            rl.prompt(); // Prompt for the next command after the current one finishes.
        });
    });

    // Listen for the 'close' event on the readline interface, which indicates it's being closed.
    rl.on('close', () => {
        // This log is primarily for ensuring a clean exit message.
        // process.exit(0) in the 'exit' command handler handles the actual termination.
        console.log('Readline interface closed.');
    });
}

// Start the shell when the script is run.
startShell();
