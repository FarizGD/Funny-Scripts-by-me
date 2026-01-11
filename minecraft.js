const { exec, spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');

// --- Configuration ---
const javaDownloadUrl =
  'https://download.java.net/java/GA/jdk21.0.2/f2283984656d49d69e91c558476027ac/13/GPL/openjdk-21.0.2_linux-x64_bin.tar.gz';

const javaArchiveName = 'openjdk-21.0.2_linux-x64_bin.tar.gz';
const extractedJavaDir = 'jdk-21.0.2';

const serverJarUrl =
  'https://fill-data.papermc.io/v1/objects/65af6fc34f2bcb09bcd28f6eead1f402e9be2636a0312ed3e170e67c82179025/paper-1.21.11-91.jar';

const serverJarName = 'paper-1.21.4-231.jar';

const downloadDir = path.join(__dirname, 'server');
const javaInstallDir = path.join(__dirname, 'java');

const javaArchivePath = path.join(downloadDir, javaArchiveName);
const serverJarPath = path.join(downloadDir, serverJarName);

let javaBinPath = '';

// Aikar flags
const javaArgs = [
  '-Xms256M',
  '-XX:+UseG1GC',
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
  serverJarName
];

// --- Helper ---
function executeCommand(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      if (stderr) console.warn(stderr);
      resolve(stdout);
    });
  });
}

// --- Main ---
async function setupAndRunServer() {
  try {
    // 1. Directories
    await fs.promises.mkdir(downloadDir, { recursive: true });
    await fs.promises.mkdir(javaInstallDir, { recursive: true });

    // 2. Download Java
    if (!fs.existsSync(javaArchivePath)) {
      console.log('Downloading Java...');
      await new Promise((resolve, reject) => {
        https.get(javaDownloadUrl, res => {
          if (res.statusCode !== 200)
            return reject(new Error('Java download failed'));
          const file = fs.createWriteStream(javaArchivePath);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        }).on('error', reject);
      });
    }

    // 3. Extract Java
    const javaDirs = await fs.promises.readdir(javaInstallDir);
    let foundJavaDir = javaDirs.find(d => d.includes(extractedJavaDir));

    if (!foundJavaDir) {
      console.log('Extracting Java...');
      await executeCommand(
        `tar -xzf "${javaArchivePath}" -C "${javaInstallDir}"`
      );
      const dirsAfter = await fs.promises.readdir(javaInstallDir);
      foundJavaDir = dirsAfter.find(d => d.includes(extractedJavaDir));
    }

    if (!foundJavaDir)
      throw new Error('Java extraction failed');

    javaBinPath = path.join(javaInstallDir, foundJavaDir, 'bin', 'java');
    await fs.promises.access(javaBinPath, fs.constants.X_OK);

    // 4. Download server jar
    if (!fs.existsSync(serverJarPath)) {
      console.log('Downloading Paper...');
      await new Promise((resolve, reject) => {
        https.get(serverJarUrl, res => {
          if (res.statusCode !== 200)
            return reject(new Error('Server jar download failed'));
          const file = fs.createWriteStream(serverJarPath);
          res.pipe(file);
          file.on('finish', () => file.close(resolve));
        }).on('error', reject);
      });
    }

    // 5. EULA (FIXED)
    const eulaPath = path.join(downloadDir, 'eula.txt');
    await fs.promises.writeFile(eulaPath, 'eula=true\n', 'utf8');
    console.log('EULA accepted');

    // 6. Run server
    console.log('Starting server...');
    const server = spawn(javaBinPath, javaArgs, {
      cwd: downloadDir,
      stdio: 'inherit'
    });

    server.on('exit', code => {
      console.log(`Server exited with code ${code}`);
    });

    server.on('error', err => {
      console.error('Failed to start server:', err);
    });

  } catch (err) {
    console.error('Setup failed:', err);
  }
}

setupAndRunServer();
