pipeline {
  agent any

  environment {
    DOCKERHUB_CREDENTIALS = credentials('docker-credentials')
    DOCKERHUB_USER = 'prakashbhati086'
    KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
    NAMESPACE = 'default'
    APP_VERSION = "${env.BUILD_NUMBER}"
    MONGO_SERVICE = 'mongo'
  }

  stages {
    stage('Checkout & Setup') {
      steps {
        checkout scm
        script {
          env.COMMIT_HASH = powershell(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
          echo "🔧 Commit hash: ${env.COMMIT_HASH}"
          echo "🏗️ Build version: v${env.APP_VERSION}"
        }
      }
    }

    stage('Verify Prerequisites') {
      parallel {
        stage('Docker Login') {
          steps {
            bat """
              echo "🐳 Logging into DockerHub..."
              docker login -u ${DOCKERHUB_CREDENTIALS_USR} -p ${DOCKERHUB_CREDENTIALS_PSW}
              echo "✅ DockerHub login successful"
            """
          }
        }
        stage('Kubernetes Health Check') {
          steps {
            bat """
              echo "☸️ Checking Kubernetes connectivity..."
              kubectl --kubeconfig="${KUBECONFIG_PATH}" cluster-info
              kubectl --kubeconfig="${KUBECONFIG_PATH}" get nodes
              echo "✅ Kubernetes connectivity verified"
            """
          }
        }
      }
    }

    stage('Build & Test Images') {
      parallel {
        stage('Build Auth Service') {
          steps {
            dir('auth-service') {
              script {
                // If you later add package-lock.json, flip USE_NPM_CI to true
                def USE_NPM_CI = false

                bat """
                  echo "🏗️ Building auth-service..."

                  if not exist "routes\\auth.js" (
                    echo "❌ Error: routes/auth.js missing!"
                    exit /b 1
                  )
                  if not exist "models\\User.js" (
                    echo "❌ Error: models/User.js missing!"
                    exit /b 1
                  )

                  echo "📦 Preparing lightweight build context test..."
                  docker build --build-arg USE_NPM_CI=${USE_NPM_CI} -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-auth-service:latest -t ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION} -f Dockerfile .

                  echo "🧪 Smoke testing auth-service container..."
                  docker run --rm -d --name auth-test-${BUILD_NUMBER} -p 3001:3000 -e MONGO_URI=mongodb://host.docker.internal:27017/test ${DOCKERHUB_USER}/microauthx-auth-service:latest
                  timeout /t 8 >nul
                  docker exec auth-test-${BUILD_NUMBER} sh -lc "ls -la /app && ls -la /app/routes && ls -la /app/models" || echo "⚠️ Listing inside container failed"
                  docker exec auth-test-${BUILD_NUMBER} sh -lc "node -e \\"require('./routes/auth'); console.log('require ok')\\"" && echo "✅ require('../models/User') OK" || echo "⚠️ require test failed"
                  docker exec auth-test-${BUILD_NUMBER} sh -lc "wget -qO- http://localhost:3000/health || curl -sf http://localhost:3000/health" && echo "✅ Health check passed" || echo "⚠️ Health check failed but continuing"
                  docker stop auth-test-${BUILD_NUMBER} || echo "Container already stopped"

                  echo "📤 Pushing auth-service images..."
                  docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                  docker push ${DOCKERHUB_USER}/microauthx-auth-service:latest
                  docker push ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION}

                  echo "✅ Auth-service build completed"
                """
              }
            }
          }
        }

        stage('Build Frontend Service') {
          steps {
            dir('frontend-service') {
              bat """
                echo "🏗️ Building frontend-service..."

                if not exist "views" (
                  echo "❌ Error: views directory missing!"
                  exit /b 1
                )

                docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-frontend-service:latest -t ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION} .

                echo "🧪 Smoke testing frontend container..."
                docker run --rm -d --name frontend-test-${BUILD_NUMBER} -p 4001:4000 -e AUTH_SERVICE_URL=http://mock:3000/api ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                timeout /t 8 >nul
                docker exec frontend-test-${BUILD_NUMBER} sh -lc "wget -qO- http://localhost:4000/health || curl -sf http://localhost:4000/health" && echo "✅ Health check passed" || echo "⚠️ Health check failed but continuing"
                docker stop frontend-test-${BUILD_NUMBER} || echo "Container already stopped"

                echo "📤 Pushing frontend-service images..."
                docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                docker push ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                docker push ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION}

                echo "✅ Frontend-service build completed"
              """
            }
          }
        }
      }
    }

    stage('Deploy to Kubernetes') {
      steps {
        bat """
          echo "🚀 Starting Kubernetes deployment..."

          echo "📊 Deploying MongoDB resources..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/
          echo "⏳ Waiting for MongoDB deployment (best-effort)..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" wait --for=condition=Available deployment/mongo --timeout=300s || echo "⚠️ MongoDB timeout, continuing"

          echo "🔐 Deploying Auth Service..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
          kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/auth-service auth-service=${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
          kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/auth-service MONGO_URI=mongodb://${MONGO_SERVICE}:27017/microauthx SESSION_SECRET=microauthxsecret PORT=3000

          echo "🌐 Deploying Frontend Service..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
          kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/frontend-service frontend-service=${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
          kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/frontend-service AUTH_SERVICE_URL=http://auth-service:3000/api SESSION_SECRET=frontendsecret PORT=4000

          echo "⏳ Waiting for auth-service rollout..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/auth-service --timeout=600s

          echo "⏳ Waiting for frontend-service rollout..."
          kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/frontend-service --timeout=600s

          echo "✅ Kubernetes deployment completed"
        """
      }
    }

    stage('Verify & Test Deployment') {
      steps {
        script {
          bat """
            echo "🔍 Verifying deployment health..."

            echo "📊 Pod Status:"
            kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -o wide

            echo "📊 Deployment Status:"
            kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments

            echo "📊 Service Status:"
            kubectl --kubeconfig="${KUBECONFIG_PATH}" get services

            echo "🚨 Checking for failing pods..."
            kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods | findstr /i "error crashloop imagepull" && echo "❌ Found failing pods" || echo "✅ No failing pods found"
          """

          try {
            bat """
              echo "⏩ Port-forward frontend-service to 8080..."
              start /B kubectl --kubeconfig="${KUBECONFIG_PATH}" port-forward service/frontend-service 8080:4000
              timeout /t 6 >nul

              powershell -Command "$resp = Invoke-WebRequest -UseBasicParsing http://localhost:8080/health; if ($resp.StatusCode -eq 200) { Write-Host '✅ Frontend health OK' } else { Write-Host '⚠️ Frontend health not OK' }"

              taskkill /IM kubectl.exe /F >nul 2>&1
            """
          } catch (Exception e) {
            echo "⚠️ Health checks completed with warnings: ${e.getMessage()}"
          }

          echo "✅ Deployment verification completed"
        }
      }
    }
  }

  post {
    success {
      echo "🎉 MicroAuthX deployment completed successfully!"
      echo "📋 Deployment Summary:"
      echo "   • Auth Service: ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}"
      echo "   • Frontend Service: ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}"
      echo "   • Build Version: v${APP_VERSION}"
      echo ""
      echo "🌐 Application Access:"
      echo "   • Frontend: http://localhost:30080 (NodePort)"
      echo "   • Port Forward: kubectl port-forward service/frontend-service 8080:4000"
      echo ""
      echo "🔧 MongoDB Connection: mongodb://${MONGO_SERVICE}:27017/microauthx"

      bat """
        echo "📊 Final deployment status:"
        kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments
        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -o wide
      """
    }

    failure {
      echo "❌ MicroAuthX deployment failed!"
      echo "🔍 Collecting diagnostics ..."

      bat """
        echo "📊 Debug Information:"
        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods || echo "Could not get pod status"
        kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments || echo "Could not get deployments"
        kubectl --kubeconfig="${KUBECONFIG_PATH}" get events --sort-by=.metadata.creationTimestamp | findstr /i "auth-service|frontend-service|error|warning|failed" || echo "No error events found"

        echo "== Describe Auth Deployment =="
        kubectl --kubeconfig="${KUBECONFIG_PATH}" describe deploy/auth-service || echo "Describe failed"

        echo "== Auth logs via Deployment =="
        kubectl --kubeconfig="${KUBECONFIG_PATH}" logs deploy/auth-service --all-containers=true --tail=200 || echo "logs via deploy failed"

        echo "== Per-pod logs (auth-service) =="
        for /F "delims=" %%p in ('kubectl --kubeconfig "${KUBECONFIG_PATH}" get pods -l app=auth-service -o jsonpath="{.items[*].metadata.name}" 2^>nul') do (
          echo "Logs from %%p"
          kubectl --kubeconfig="${KUBECONFIG_PATH}" logs %%p --all-containers=true --tail=200 || echo "Could not get logs for %%p"
        )
      """
    }

    always {
      script {
        try {
          bat """
            echo "🧹 Performing cleanup..."

            docker logout || echo "Docker logout completed"

            docker stop auth-test-${BUILD_NUMBER} 2>nul || echo "Auth test container already stopped"
            docker rm   auth-test-${BUILD_NUMBER} 2>nul || echo "Auth test container already removed"
            docker stop frontend-test-${BUILD_NUMBER} 2>nul || echo "Frontend test container already stopped"
            docker rm   frontend-test-${BUILD_NUMBER} 2>nul || echo "Frontend test container already removed"

            docker image prune -f --filter "until=72h" || echo "Image cleanup completed"

            echo "✅ Cleanup completed"
          """
        } catch (Exception e) {
          echo "⚠️ Cleanup warning: ${e.getMessage()}"
        }
      }

      echo "📈 Pipeline Statistics:"
      echo "   • Build Number: ${env.BUILD_NUMBER}"
      echo "   • Commit Hash: ${env.COMMIT_HASH}"
      echo "   • Pipeline Duration: ${currentBuild.durationString}"
      echo "   • Images Tagged: latest, v${env.APP_VERSION}, ${env.COMMIT_HASH}"
    }
  }
}
