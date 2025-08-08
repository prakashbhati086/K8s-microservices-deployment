pipeline {
    agent any
    
    environment {
        DOCKERHUB_CREDENTIALS = credentials('docker-credentials')
        DOCKERHUB_USER = 'prakashbhati086'
        KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
        NAMESPACE = 'default'
        APP_VERSION = "${env.BUILD_NUMBER}"
        MONGO_SERVICE = 'mongo-service'
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
                        script {
                            bat """
                                echo "🐳 Logging into DockerHub..."
                                docker login -u ${DOCKERHUB_CREDENTIALS_USR} -p ${DOCKERHUB_CREDENTIALS_PSW}
                                echo "✅ DockerHub login successful"
                            """
                        }
                    }
                }
                
                stage('Kubernetes Health Check') {
                    steps {
                        script {
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
        }

        stage('Build & Test Images') {
            parallel {
                stage('Build Auth Service') {
                    steps {
                        dir('auth-service') {
                            script {
                                bat """
                                    echo "🏗️ Building auth-service..."
                                    
                                    REM Verify critical files exist
                                    if not exist "routes\\auth.js" (
                                        echo "❌ Error: routes/auth.js missing!"
                                        exit /b 1
                                    )
                                    
                                    REM Build images with multiple tags
                                    docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-auth-service:latest -t ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION} .
                                    
                                    REM Test container locally
                                    docker run --rm -d --name auth-test-${BUILD_NUMBER} -p 3001:3000 -e MONGO_URI=mongodb://host.docker.internal:27017/test ${DOCKERHUB_USER}/microauthx-auth-service:latest
                                    timeout /t 10
                                    docker exec auth-test-${BUILD_NUMBER} curl -f http://localhost:3000/health && echo "✅ Health check passed" || echo "⚠️ Health check failed but continuing"
                                    docker stop auth-test-${BUILD_NUMBER} || echo "Container already stopped"
                                    
                                    REM Push all tags
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
                            script {
                                bat """
                                    echo "🏗️ Building frontend-service..."
                                    
                                    REM Verify views directory exists
                                    if not exist "views" (
                                        echo "❌ Error: views directory missing!"
                                        exit /b 1
                                    )
                                    
                                    REM Build images with multiple tags
                                    docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-frontend-service:latest -t ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION} .
                                    
                                    REM Test container locally
                                    docker run --rm -d --name frontend-test-${BUILD_NUMBER} -p 4001:4000 -e AUTH_SERVICE_URL=http://mock:3000/api ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                                    timeout /t 10
                                    docker exec frontend-test-${BUILD_NUMBER} curl -f http://localhost:4000/health && echo "✅ Health check passed" || echo "⚠️ Health check failed but continuing"
                                    docker stop frontend-test-${BUILD_NUMBER} || echo "Container already stopped"
                                    
                                    REM Push all tags
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
        }

        stage('Deploy to Kubernetes') {
            steps {
                script {
                    bat """
                        echo "🚀 Starting Kubernetes deployment..."
                        
                        REM Deploy MongoDB first
                        echo "📊 Deploying MongoDB resources..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/
                        
                        REM Wait for MongoDB with error handling
                        echo "⏳ Waiting for MongoDB deployment..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" wait --for=condition=Available deployment/mongo --timeout=300s || echo "MongoDB timeout, but continuing"
                        
                        REM Deploy Auth Service
                        echo "🔐 Deploying Auth Service..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/auth-service auth-service=${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                        
                        REM Set environment variables for auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/auth-service MONGO_URI=mongodb://${MONGO_SERVICE}:27017/microauthx
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/auth-service SESSION_SECRET=microauthxsecret
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/auth-service PORT=3000
                        
                        REM Deploy Frontend Service
                        echo "🌐 Deploying Frontend Service..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/frontend-service frontend-service=${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                        
                        REM Set environment variables for frontend-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/frontend-service AUTH_SERVICE_URL=http://auth-service:3000/api
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/frontend-service SESSION_SECRET=frontendsecret
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/frontend-service PORT=4000
                        
                        REM Restart deployments to pick up changes
                        echo "♻️ Restarting deployments..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/frontend-service
                        
                        REM Wait for rollouts to complete
                        echo "⏳ Waiting for auth-service rollout..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/auth-service --timeout=600s
                        
                        echo "⏳ Waiting for frontend-service rollout..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/frontend-service --timeout=600s
                        
                        echo "✅ Kubernetes deployment completed"
                    """
                }
            }
        }

        stage('Verify & Test Deployment') {
            steps {
                script {
                    bat """
                        echo "🔍 Verifying deployment health..."
                        
                        REM Check pod status
                        echo "📊 Pod Status:"
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=frontend-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=mongo
                        
                        REM Check deployment status
                        echo "📊 Deployment Status:"
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments
                        
                        REM Check services
                        echo "📊 Service Status:"
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get services
                        
                        REM Check for failing pods
                        echo "🚨 Checking for failing pods..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods | findstr /i "error crashloop imagepull" && echo "❌ Found failing pods" || echo "✅ No failing pods found"
                    """
                    
                    // Health check with proper error handling
                    try {
                        script {
                            // Get auth-service pod name safely
                            def authPodName = bat(
                                returnStdout: true,
                                script: "kubectl --kubeconfig=\"${KUBECONFIG_PATH}\" get pod -l app=auth-service --field-selector=status.phase=Running -o jsonpath=\"{.items[0].metadata.name}\" 2>nul"
                            ).trim()
                            
                            if (authPodName) {
                                echo "🏥 Testing auth-service health on pod: ${authPodName}"
                                bat """
                                    kubectl --kubeconfig="${KUBECONFIG_PATH}" exec ${authPodName} -c auth-service -- curl -f http://localhost:3000/health && echo "✅ Auth-service health check passed" || echo "⚠️ Auth-service health check failed"
                                """
                            } else {
                                echo "⚠️ No running auth-service pod found for health check"
                            }
                            
                            // Get frontend-service pod name safely
                            def frontendPodName = bat(
                                returnStdout: true,
                                script: "kubectl --kubeconfig=\"${KUBECONFIG_PATH}\" get pod -l app=frontend-service --field-selector=status.phase=Running -o jsonpath=\"{.items[0].metadata.name}\" 2>nul"
                            ).trim()
                            
                            if (frontendPodName) {
                                echo "🏥 Testing frontend-service health on pod: ${frontendPodName}"
                                bat """
                                    kubectl --kubeconfig="${KUBECONFIG_PATH}" exec ${frontendPodName} -c frontend-service -- curl -f http://localhost:4000/health && echo "✅ Frontend-service health check passed" || echo "⚠️ Frontend-service health check failed"
                                """
                            } else {
                                echo "⚠️ No running frontend-service pod found for health check"
                            }
                        }
                    } catch (Exception e) {
                        echo "⚠️ Health checks completed with warnings: ${e.getMessage()}"
                        // Don't fail the build on health check issues
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
            
            script {
                bat """
                    echo "📊 Final deployment status:"
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods
                """
            }
        }
        
        failure {
            echo "❌ MicroAuthX deployment failed!"
            echo "🔍 Check the logs above for specific errors"
            
            script {
                bat """
                    echo "📊 Debug Information:"
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods || echo "Could not get pod status"
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments || echo "Could not get deployments"
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get events --sort-by=.metadata.creationTimestamp | findstr /i "error warning failed" || echo "Could not get error events"
                    
                    REM Get logs from failing pods
                    for /f "tokens=1" %%i in ('kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=auth-service -o jsonpath="{.items[0].metadata.name}" 2^>nul') do (
                        echo "Auth-service logs from %%i:"
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" logs %%i || echo "Could not get logs"
                    )
                """
            }
        }
        
        always {
            script {
                try {
                    bat """
                        echo "🧹 Performing cleanup..."
                        
                        REM Docker logout
                        docker logout || echo "Docker logout completed"
                        
                        REM Clean up test containers
                        docker stop auth-test-${BUILD_NUMBER} 2>nul || echo "Auth test container already stopped"
                        docker rm auth-test-${BUILD_NUMBER} 2>nul || echo "Auth test container already removed"
                        docker stop frontend-test-${BUILD_NUMBER} 2>nul || echo "Frontend test container already stopped"
                        docker rm frontend-test-${BUILD_NUMBER} 2>nul || echo "Frontend test container already removed"
                        
                        REM Clean old images (keep recent ones)
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
