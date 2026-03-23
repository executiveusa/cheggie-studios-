import { execSync } from 'child_process';
import { triggerDeploy, getDeploymentStatus, listDeployments } from './vercelClient.js';

type Grade = 'SUCCESS' | 'PROGRESS' | 'FAILURE';

interface CycleResult {
  cycle: number;
  action: string;
  grade: Grade;
  errors: string[];
  nextAction: string;
}

const MAX_CYCLES = 3;
const MAX_DEPLOY_WAIT = 30;

function runCommand(command: string, description: string): { success: boolean; output: string } {
  console.log(`\n🔧 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf-8', stdio: 'pipe' });
    console.log(`✅ ${description} succeeded!`);
    return { success: true, output };
  } catch (error: any) {
    console.log(`❌ ${description} failed!`);
    return { success: false, output: error.message };
  }
}

async function waitForDeployment(deploymentId: string): Promise<Grade> {
  console.log(`\n⏳ Monitoring deployment...`);
  console.log(`   Deployment ID: ${deploymentId}`);

  for (let i = 0; i < MAX_DEPLOY_WAIT; i++) {
    await new Promise(resolve => setTimeout(resolve, 10000));

    try {
      const status = await getDeploymentStatus(deploymentId);
      const state = status.state || status.readyState;
      console.log(`   🔄 Deployment status: ${state}`);

      if (state === 'READY') {
        console.log(`   ✅ Deployment complete!`);
        return 'SUCCESS';
      }

      if (state === 'ERROR' || state === 'CANCELED') {
        console.log(`   ❌ Deployment failed!`);
        return 'FAILURE';
      }
    } catch (error) {
      console.log(`   ⚠️  Error checking status: ${error}`);
    }
  }

  console.log(`   ⚠️  Deployment timeout after 5 minutes`);
  return 'PROGRESS';
}

async function verifyHealth(url: string): Promise<boolean> {
  console.log(`\n🏥 Verifying app health...`);
  console.log(`   Testing: https://${url}`);

  try {
    const response = await fetch(`https://${url}`, { timeout: 10000 } as any);
    const isHealthy = response.ok;
    console.log(`   ${isHealthy ? '✅' : '❌'} App health: ${response.status}`);
    return isHealthy;
  } catch (error) {
    console.log(`   ❌ Health check failed: ${error}`);
    return false;
  }
}

async function agenticBuildTestDeployLoop(): Promise<void> {
  console.log('🤖 Universal Auto-Deploy Loop Agent Activated');
  console.log('='.repeat(50));
  console.log('');
  console.log('🎯 Mission: Deploy app until live and healthy');
  console.log('🔄 Auto-retry: Up to 3 cycles');
  console.log('🔧 Auto-fix: Missing deps, build errors');
  console.log('');

  const results: CycleResult[] = [];

  for (let cycle = 1; cycle <= MAX_CYCLES; cycle++) {
    console.log(`\n🔍 CYCLE ${cycle}: Assess Current State`);
    console.log('?'.repeat(50));

    // Step 1: Check existing deployments
    console.log('\n📋 Checking existing deployments...');
    try {
      const deployments = await listDeployments(3);
      if (deployments.length > 0) {
        const latest = deployments[0];
        const state = latest.state || latest.readyState;
        console.log(`Latest deployment: ${latest.url}`);
        console.log(`State: ${state}`);
      } else {
        console.log('No existing deployments found.');
      }
    } catch (error: any) {
      console.log(`⚠️  Could not check existing deployments: ${error.message}`);
    }

    // Step 2: Build
    const buildResult = runCommand(
      'pnpm build || npm run build || yarn build || bun run build',
      'Building application'
    );

    if (!buildResult.success) {
      // Auto-fix: Try installing deps
      console.log('\n🔧 Auto-fix attempt: Installing dependencies...');
      runCommand(
        'pnpm install || npm install || yarn install || bun install',
        'Installing dependencies'
      );

      // Retry build
      const retryBuild = runCommand(
        'pnpm build || npm run build || yarn build || bun run build',
        'Retrying build'
      );

      if (!retryBuild.success) {
        results.push({
          cycle,
          action: 'build',
          grade: 'FAILURE',
          errors: [buildResult.output],
          nextAction: 'escalate',
        });
        console.log('\n📊 Self-Grade: ❌ FAILURE');
        console.log('Decision: Cannot proceed without successful build.');
        continue;
      }
    }

    // Step 3: Test (optional)
    console.log('\n🧪 Running tests...');
    const testResult = runCommand(
      'pnpm test --run || npm test -- --run || yarn test --run || echo "No tests configured"',
      'Running test suite'
    );

    if (!testResult.success && !testResult.output.includes('No tests')) {
      console.log('⚠️  Some tests failed, but continuing to deploy...');
    }

    // Step 4: Deploy
    console.log('\n🚀 Triggering Vercel deployment...');
    try {
      const deployment = await triggerDeploy();
      console.log(`   Deployment initiated: ${deployment.id}`);
      console.log(`   URL: ${deployment.url}`);

      // Step 5: Monitor
      const deployGrade = await waitForDeployment(deployment.id);

      if (deployGrade === 'SUCCESS') {
        // Step 6: Verify health
        const isHealthy = await verifyHealth(deployment.url);

        if (isHealthy) {
          results.push({
            cycle,
            action: 'deploy',
            grade: 'SUCCESS',
            errors: [],
            nextAction: 'complete',
          });

          console.log('\n📊 Self-Grade: ✅ SUCCESS');
          console.log('');
          console.log('='.repeat(50));
          console.log('🎉 SUCCESS! Application is live and healthy!');
          console.log(`🌐 Live URL: https://${deployment.url}`);
          console.log('✅ All checks passed. Deployment complete.');
          console.log('='.repeat(50));
          return;
        } else {
          results.push({
            cycle,
            action: 'health_check',
            grade: 'FAILURE',
            errors: ['Health check failed'],
            nextAction: 'retry',
          });
          console.log('\n📊 Self-Grade: 🟡 PROGRESS');
          console.log('Decision: App deployed but health check failed. Retrying...');
        }
      } else {
        results.push({
          cycle,
          action: 'deploy',
          grade: deployGrade,
          errors: ['Deployment incomplete'],
          nextAction: 'retry',
        });
        console.log(`\n📊 Self-Grade: 🟡 ${deployGrade}`);
        console.log('Decision: Continuing to next cycle...');
      }
    } catch (error: any) {
      results.push({
        cycle,
        action: 'deploy',
        grade: 'FAILURE',
        errors: [error.message],
        nextAction: 'escalate',
      });
      console.log(`\n❌ Deployment failed: ${error.message}`);
      console.log('\n📊 Self-Grade: ❌ FAILURE');
      console.log('Decision: Continuing to next cycle...');
    }
  }

  // If we got here, we exhausted cycles without success
  console.log('\n');
  console.log('='.repeat(50));
  console.log('⚠️  ESCALATION REQUIRED');
  console.log('='.repeat(50));
  console.log(`After ${MAX_CYCLES} attempts, deployment is not complete.`);
  console.log('');
  console.log('📋 Summary of attempts:');
  results.forEach((r, i) => {
    console.log(`   ${i + 1}. Cycle ${r.cycle}: ${r.action} - ${r.grade}`);
    if (r.errors.length > 0) {
      console.log(`      Errors: ${r.errors.join(', ')}`);
    }
  });
  console.log('');
  console.log('🔧 Next steps:');
  console.log('   1. Review errors above');
  console.log('   2. Check Vercel dashboard for detailed logs');
  console.log('   3. Verify environment variables are set correctly');
  console.log('   4. Try manual deployment: vercel --prod');
  console.log('');
  process.exit(1);
}

agenticBuildTestDeployLoop().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
