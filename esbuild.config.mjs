import esbuild from 'esbuild';
import process from 'process';

const isProduction = process.env.NODE_ENV === 'production';
const watch = process.argv.includes('--watch');

const options = {
  entryPoints: ['src/main.ts'], 
  bundle: true,
  external: ['obsidian'], 
  format: 'cjs', 
  target: 'es2020',
  sourcemap: isProduction ? false : 'inline', 
  minify: isProduction, 
  outfile: 'dist/main.js',
  logLevel: 'info', 
  sourcemap: false,
};

async function build() {
  if (watch) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(options);
    console.log('Build finished.');
  }
}

build().catch(() => process.exit(1));