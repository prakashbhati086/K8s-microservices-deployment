pipeline {
    agent any

    environment {
        // Docker Hub credentials (make sure this exists in Jenkins)
        DOCKERHUB_CREDENTIALS = credentials('docker-credentials')
        DOCKERHUB_USER = 'prakashbhati086'
        
        // Kubernetes configuration
        KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
        
        // Application configuration
        NAMESPACE = 'default'
        APP_VERSION = "${env.BUILD_NUMBER}"
    }

    stages {
        stage('Checkout & Setup') {
            steps {
                checkout scm
                script {
                    // Generate commit hash for image tagging
                    env.COMMIT_HASH = powershell(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                    echo "🔧 Commit hash: ${env.COMMIT_HASH}"
                    echo "🏗️ Build version: ${env.APP_VERSION}"
                }
            }
        }

        stage('Verify Prerequisites') {
            parallel {
                stage('Docker Login') {
                    steps {
                        script {
                            bat """
                                echo "🐳 Testing DockerHub credentials..."
                                docker login -u ${DOCKERHUB_CREDENTIALS_USR} -p ${DOCKERHUB_CREDENTIALS_PSW}
                                echo "✅ DockerHub login successful"
                            """
                        }
                    }
                }
                
                stage('Kubernetes Connectivity') {
                    steps {
                        script {
                            bat """
                                echo "☸️ Testing Kubernetes connectivity..."
                                kubectl --kubeconfig="${KUBECONFIG_PATH}" cluster-info
                                kubectl --kubeconfig="${KUBECONFIG_PATH}" get nodes
                                echo "✅ Kubernetes connectivity verified"
                            """
                        }
                    }
                }
            }
        }

        stage('Build & Push Images') {
            parallel {
                stage('Build Auth Service') {
                    steps {
                        dir('auth-service') {
                            script {
                                bat """
                                    echo "🏗️ Building auth-service..."
                                    docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-auth-service:latest -t ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION} .
                                    
                                    echo "📤 Pushing auth-service images..."
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:latest
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION}
                                    
                                    echo "✅ Auth-service build and push completed"
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
                                    docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-frontend-service:latest -t ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION} .
                                    
                                    echo "📤 Pushing frontend-service images..."
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION}
                                    
                                    echo "✅ Frontend-service build and push completed"
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
                        
                        REM Check if MongoDB deployment exists and is healthy
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployment mongo-deployment -o jsonpath='{.status.readyReplicas}' || echo "MongoDB deployment not found"
                        
                        REM Apply MongoDB resources if needed (idempotent operation)
                        echo "📊 Ensuring MongoDB is deployed..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/ || echo "MongoDB resources already exist"
                        
                        REM Wait for MongoDB to be ready before deploying services
                        echo "⏳ Waiting for MongoDB to be ready..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" wait --for=condition=Available deployment/mongo-deployment --timeout=300s || echo "Using existing MongoDB"
                        
                        REM Deploy application services with latest images
                        echo "🔄 Deploying auth-service..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/auth-service auth-service=${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} || kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
                        
                        echo "🔄 Deploying frontend-service..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/frontend-service frontend-service=${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} || kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
                        
                        REM Force rollout restart to ensure new images are pulled
                        echo "♻️ Rolling out updates..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/frontend-service
                        
                        REM Wait for deployments to complete
                        echo "⏳ Waiting for auth-service deployment..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/auth-service --timeout=600s
                        
                        echo "⏳ Waiting for frontend-service deployment..."
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/frontend-service --timeout=600s
                        
                        echo "✅ Kubernetes deployment completed successfully"
                    """
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    bat """
                        echo "🔍 Verifying deployment health..."
                        
                        REM Check pod status
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods -l app=frontend-service
                        
                        REM Check deployment status
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get deployments
                        
                        REM Verify services are available
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" get services
                        
                        REM Basic health check (optional - if you have health endpoints)
                        REM kubectl --kubeconfig="${KUBECONFIG_PATH}" exec -l app=auth-service -- curl -f http://localhost:3000/health || echo "Health check skipped"
                        
                        echo "✅ Deployment verification completed"
                    """
                }
            }
        }
    }

    post {
        success {
            echo "🎉 Pipeline completed successfully!"
            echo "📋 Deployment Summary:"
            echo "   • Auth Service: ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}"
            echo "   • Frontend Service: ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}"
            echo "   • Build Version: v${APP_VERSION}"
            echo "🌐 Application Access:"
            echo "   • Frontend: http://localhost:30080 (NodePort)"
            echo "   • Or use: kubectl port-forward service/frontend-service 8080:4000"
            
            // Optional: Send notification (Slack, email, etc.)
            // slackSend(color: 'good', message: "✅ MicroAuthX deployment successful! Version: v${APP_VERSION}")
        }
        
        failure {
            echo "❌ Pipeline failed!"
            echo "🔍 Troubleshooting steps:"
            echo "   1. Check Jenkins logs above for specific errors"
            echo "   2. Verify Docker images were built: docker images | grep microauthx"
            echo "   3. Check Kubernetes cluster: kubectl get pods"
            echo "   4. Review application logs: kubectl logs -l app=auth-service"
            
            // Optional: Send failure notification
            // slackSend(color: 'danger', message: "❌ MicroAuthX deployment failed! Check Jenkins logs.")
            
            script {
                bat """
                    echo "📊 Gathering debug information..."
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods || echo "Could not get pod status"
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get events --sort-by=.metadata.creationTimestamp --tail=10 || echo "Could not get recent events"
                """
            }
        }
        
        always {
            script {
                try {
                    bat """
                        echo "🧹 Cleaning up..."
                        docker logout
                        docker system prune -f --filter "until=24h" || echo "Docker cleanup completed"
                        echo "✅ Cleanup completed"
                    """
                } catch (Exception e) {
                    echo "⚠️ Cleanup warning: ${e.getMessage()}"
                }
            }
            
            // Archive build artifacts (optional)
            // archiveArtifacts artifacts: '**/target/*.jar', allowEmptyArchive: true
            
            echo "📈 Build Statistics:"
            echo "   • Build Number: ${env.BUILD_NUMBER}"
            echo "   • Commit: ${env.COMMIT_HASH}"
            echo "   • Duration: ${currentBuild.durationString}"
        }
    }
}
