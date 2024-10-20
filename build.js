const esbuild = require('esbuild');
const path = require('path');

const entryPoints = {
    services: {
        productService: path.join('services', 'product-service', 'lambda', 'index.ts'),
        // other services could be similarly added here
    },
    bin: {
        shopBeCloudfront: path.join('bin', 'shop-be-cloudfront.ts'),
    }
};

// General function to build using esbuild
function build(paths, outDir) {
    Object.entries(paths).forEach(([key, value]) => {
        esbuild.build({
            entryPoints: [value],
            bundle: true,
            platform: 'node',
            target: 'node18',
            outdir: path.join('build', outDir, key),
        }).catch(() => process.exit(1));
        console.log(`Building: ${key}`);
    });
}

// Main build function
function buildAll() {
    // Build service lambdas
    build(entryPoints.services, 'services');
    // Build CDK deployment scripts
    build(entryPoints.bin, 'bin');
}

buildAll();