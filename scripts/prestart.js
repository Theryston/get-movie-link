const execSync = require('child_process').execSync;
const Loading = require("loading-cli");

const loading = new Loading({
  color: 'yellow',
});

const main = async () => {
  try {
    loading.start('Preparing prisma client...');
    execSync('npx prisma generate');
    loading.succeed('Prisma client prepared!');
  } catch (e) {
    loading.fail('Error preparing prisma client!');
  }
};

main();