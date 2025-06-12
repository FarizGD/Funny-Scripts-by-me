const { exec } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const javaDownloadUrl = 'https://download.java.net/java/GA/jdk21.0.2/f2283984656d49d69e91c558476027ac/13/GPL/openjdk-21.0.2_linux-x64_bin.tar.gz'; // <<-- REPLACE WITH ACTUAL URL
const javaArchiveName = 'openjdk-21.0.2_linux-x64_bin.tar.gz'; // Adjust if the filename is different
const extractedJavaDir = 'jdk-21.0.2'; // Expected directory name after extraction (e.g., 'jdk-21.0.1')
const serverJarUrl = 'https://api.papermc.io/v2/projects/paper/versions/1.21.4/builds/231/downloads/paper-1.21.4-231.jar'; // <<-- REPLACE WITH ACTUAL URL
const serverJarName = 'paper-1.21.4-231.jar';

const downloadDir = path.join(__dirname, 'server');
const javaInstallDir = path.join(__dirname, 'java'); // Where Java will be extracted
const javaArchivePath = path.join(downloadDir, javaArchiveName);
const serverJarPath = path.join(downloadDir, serverJarName);

// Placeholder for the dynamically determined Java binary path
let javaBinPath = '';

// Aikar's Flags for server.jar
const javaArgs = [
    '-Xms256M', // Initial heap size
    '-XX:+UseG1GC', // Use G1 Garbage Collector
    '-XX:+ParallelRefProcEnabled',
    '-XX:MaxGCPauseMillis=200',
    '-XX:+UnlockExperimentalVMOptions',
    '-XX:+DisableExplicitGC',
    '-XX:G1NewSizePercent=30',
    '-XX:G1MaxNewSizePercent=40',
    '-XX:G1HeapRegionSize=8M',
    '-XX:G1ReservePercent=20',
    '-XX:G1HeapWastePercent=5',
    '-XX:G1MixedGCCountTarget=4',
    '-XX:InitiatingHeapOccupancyPercent=15',
    '-XX:G1MixedGCLiveThresholdPercent=90',
    '-XX:G1RSetUpdatingPauseTimePercent=5',
    '-XX:SurvivorRatio=32',
    '-XX:+PerfDisableSharedMem',
    '-XX:MaxTenuringThreshold=1',
    '-Dusing.aikars.flags=https://mcflags.emc.gs',
    '-Daikars.new.flags=true',
    '-jar',
    serverJarName // This must be the last argument before the JAR path
];

// --- Helper function for executing shell commands ---
function executeCommand(command, options = {}) {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${command}`);
                console.error(`Error: ${error.message}`);
                console.error(`Stderr: ${stderr}`);
                return reject(error);
            }
            if (stderr) {
                console.warn(`Command stderr: ${stderr}`);
            }
            console.log(`Command stdout: ${stdout}`);
            resolve(stdout);
        });
    });
}

// --- Main Script Logic ---
async function setupAndRunServer() {
    try {
        // 1. Create necessary directories
        console.log('Creating download and installation directories...');
        await fs.promises.mkdir(downloadDir, { recursive: true });
        await fs.promises.mkdir(javaInstallDir, { recursive: true });
        console.log('Directories created.');

        // 2. Download Java 21 .tar.gz
        let javaFileExists = false;
        try {
            await fs.promises.access(javaArchivePath, fs.constants.F_OK);
            javaFileExists = true;
            console.log(`Java archive already exists at ${javaArchivePath}. Skipping download.`);
        } catch (e) {
            // File does not exist, proceed with download
        }

        if (!javaFileExists) {
            console.log(`Downloading Java from ${javaDownloadUrl} to ${javaArchivePath}...`);
            await new Promise((resolve, reject) => {
                https.get(javaDownloadUrl, (response) => {
                    if (response.statusCode !== 200) {
                        return reject(new Error(`Failed to download Java. Status Code: ${response.statusCode}`));
                    }
                    const file = fs.createWriteStream(javaArchivePath);
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('Java downloaded successfully.');
                        resolve();
                    });
                    file.on('error', (err) => {
                        fs.unlink(javaArchivePath, () => reject(err)); // Delete the file if an error occurs
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            });
        }

        // 3. Extract Java
        // Check if Java is already extracted
        const extractedJavaContent = await fs.promises.readdir(javaInstallDir);
        let actualExtractedJavaDir = extractedJavaContent.find(name => name.includes(extractedJavaDir)); // Find a directory that matches our expected prefix

        if (actualExtractedJavaDir) {
            console.log(`Java appears to be already extracted to ${path.join(javaInstallDir, actualExtractedJavaDir)}. Skipping extraction.`);
            javaBinPath = path.join(javaInstallDir, actualExtractedJavaDir, 'bin', 'java');
        } else {
            console.log(`Extracting Java from ${javaArchivePath} to ${javaInstallDir}...`);
            await executeCommand(`tar -xzf "${javaArchivePath}" -C "${javaInstallDir}"`);
            console.log('Java extracted successfully.');

            // After extraction, we need to find the exact name of the extracted directory.
            const newlyExtractedContent = await fs.promises.readdir(javaInstallDir);
            actualExtractedJavaDir = newlyExtractedContent.find(name => name.includes(extractedJavaDir));

            if (!actualExtractedJavaDir) {
                throw new Error(`Could not determine the exact extracted Java directory in ${javaInstallDir}. Please check the tarball content.`);
            }
            javaBinPath = path.join(javaInstallDir, actualExtractedJavaDir, 'bin', 'java');
        }

        // Verify the java executable exists and is runnable
        try {
            await fs.promises.access(javaBinPath, fs.constants.X_OK);
            console.log(`Java executable found and is runnable at ${javaBinPath}.`);
        } catch (e) {
            throw new Error(`Java executable not found or not executable at ${javaBinPath}. Error: ${e.message}`);
        }

        // 4. Download server.jar
        let serverJarFileExists = false;
        try {
            await fs.promises.access(serverJarPath, fs.constants.F_OK);
            serverJarFileExists = true;
            console.log(`server.jar already exists at ${serverJarPath}. Skipping download.`);
        } catch (e) {
            // File does not exist, proceed with download
        }

        if (!serverJarFileExists) {
            console.log(`Downloading server.jar from ${serverJarUrl} to ${serverJarPath}...`);
            await new Promise((resolve, reject) => {
                https.get(serverJarUrl, (response) => {
                    if (response.statusCode !== 200) {
                        return reject(new Error(`Failed to download server.jar. Status Code: ${response.statusCode}`));
                    }
                    const file = fs.createWriteStream(serverJarPath);
                    response.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        console.log('server.jar downloaded successfully.');
                        resolve();
                    });
                    file.on('error', (err) => {
                        fs.unlink(serverJarPath, () => reject(err)); // Delete the file if an error occurs
                    });
                }).on('error', (err) => {
                    reject(err);
                });
            });
        }

        // Verify server.jar exists
        try {
            await fs.promises.access(serverJarPath, fs.constants.F_OK);
            console.log(`server.jar found at ${serverJarPath}.`);
        } catch (e) {
            throw new Error(`server.jar not found at ${serverJarPath}. Error: ${e.message}`);
        }

//Eula Handling
fs.writeFile("./server/eula.txt", "eula=true', (err) => {
    // Check if an error occurred during the file write operation.
    if (err) {
        // If an error exists, log it to the console with an informative message.
        console.error(`Error writing to file eula:`, err);
        return; // Exit the function to prevent further execution in case of error.
    }
    // If no error, log a success message to the console.
    console.log(`Successfully wrote eula`);
    console.log(`File located at: idk`);
});




        // 5. Run server.jar with the downloaded Java and Aikar's Flags
        // Construct the full command string
        const fullJavaCommand = `"${javaBinPath}" ${javaArgs.join(' ')}`;
        console.log(`Running server.jar using Java from ${javaBinPath} with Aikar's Flags...`);
        console.log(`Command: ${fullJavaCommand}`);

        // Use spawn for long-running processes like servers, as it allows for better control
        // and doesn't buffer all output before returning.
        const serverProcess = require('child_process').spawn(javaBinPath, javaArgs, { cwd: downloadDir, stdio: 'inherit' });

        serverProcess.on('close', (code) => {
            console.log(`Server process exited with code ${code}`);
        });

        serverProcess.on('error', (err) => {
            console.error('Failed to start server process:', err);
        });

    } catch (error) {
        console.error('An error occurred during the process:', error);
    }
}

setupAndRunServer();
