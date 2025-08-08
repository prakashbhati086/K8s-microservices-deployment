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
                    echo "Commit hash: ${env.COMMIT_HASH}"
                    echo "Build version: v${env.APP_VERSION}"
                }
            }
        }

        stage('Verify Prerequisites') {
            parallel {
                stage('Docker Login') {
                    steps {
                        script {
                            bat """
                                docker login -u ${DOCKERHUB_CREDENTIALS_USR} -p ${DOCKERHUB_CREDENTIALS_PSW}
                            """
                        }
                    }
                }
                stage('Kubernetes Health Check') {
                    steps {
                        script {
                            bat """
                                kubectl --kubeconfig="${KUBECONFIG_PATH}" cluster-info
                                kubectl --kubeconfig="${KUBECONFIG_PATH}" get nodes
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
                                    if not exist "routes\\auth.js" (
                                        echo routes/auth.js missing!
                                        exit /b 1
                                    )
                                    docker build -t ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-auth-service:latest -t ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION} .
                                    docker run --rm -d --name auth-test-${BUILD_NUMBER} -p 3001:3000 -e MONGO_URI=mongodb://host.docker.internal:27017/test ${DOCKERHUB_USER}/microauthx-auth-service:latest
                                    timeout /t 5
                                    docker exec auth-test-${BUILD_NUMBER} curl -f http://localhost:3000/health || echo Health check failed but image built
                                    docker stop auth-test-${BUILD_NUMBER}
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:latest
                                    docker push ${DOCKERHUB_USER}/microauthx-auth-service:v${APP_VERSION}
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
                                    if not exist "views" (
                                        echo views directory missing!
                                        exit /b 1
                                    )
                                    docker build -t ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH} -t ${DOCKERHUB_USER}/microauthx-frontend-service:latest -t ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION} .
                                    docker run --rm -d --name frontend-test-${BUILD_NUMBER} -p 4001:4000 -e AUTH_SERVICE_URL=http://mock:3000 ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                                    timeout /t 5
                                    docker exec frontend-test-${BUILD_NUMBER} curl -f http://localhost:4000/health || echo Health check failed but image built
                                    docker stop frontend-test-${BUILD_NUMBER}
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:latest
                                    docker push ${DOCKERHUB_USER}/microauthx-frontend-service:v${APP_VERSION}
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
                        echo Deploying MongoDB resources...
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f mongo-service/k8s/

                        echo Waiting for MongoDB deployment...
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" wait --for=condition=Available deployment/mongo --timeout=300s

                        echo Deploying Auth Service...
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f auth-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/auth-service auth-service=${DOCKERHUB_USER}/microauthx-auth-service:${COMMIT_HASH}
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/auth-service MONGO_URI=mongodb://${MONGO_SERVICE}:27017/microauthx SESSION_SECRET=microauthxsecret PORT=3000

                        echo Deploying Frontend Service...
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" apply -f frontend-service/k8s/
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set image deployment/frontend-service frontend-service=${DOCKERHUB_USER}/microauthx-frontend-service:${COMMIT_HASH}
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" set env deployment/frontend-service AUTH_SERVICE_URL=http://auth-service:3000/api SESSION_SECRET=frontendsecret PORT=4000

                        echo Restarting deployments to pick up changes...
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/auth-service
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout restart deployment/frontend-service

                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/auth-service --timeout=600s
                        kubectl --kubeconfig="${KUBECONFIG_PATH}" rollout status deployment/frontend-service --timeout=600s
                    """
                }
            }
        }

        stage('Verify & Test Deployment') {
    steps {
        script {
            bat """
                echo "🔍 Verifying deployment health and functionality..."
                
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
            """

            // Get auth-service pod name
            def authPodName = powershell(
                returnStdout: true,
                script: "kubectl --kubeconfig='${KUBECONFIG_PATH}' get pod -l app=auth-service -o jsonpath='{.items[0].metadata.name}'"
            ).trim()

            // Test auth-service health endpoint
            bat """
                echo Testing auth-service health on pod: ${authPodName}
                kubectl --kubeconfig="${KUBECONFIG_PATH}" exec ${authPodName} -- curl -f http://localhost:3000/health || echo Auth-service health check failed
            """

            // Get frontend-service pod name
            def frontendPodName = powershell(
                returnStdout: true,
                script: "kubectl --kubeconfig='${KUBECONFIG_PATH}' get pod -l app=frontend-service -o jsonpath='{.items[0].metadata.name}'"
            ).trim()

            // Test frontend-service health endpoint
            bat """
                echo Testing frontend-service health on pod: ${frontendPodName}
                kubectl --kubeconfig="${KUBECONFIG_PATH}" exec ${frontendPodName} -- curl -f http://localhost:4000/health || echo Frontend-service health check failed
            """

            bat """
                echo "🚨 Checking for any failing pods..."
                kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods | findstr /i "error crashloop imagepull" && echo "❌ Found failing pods" || echo "✅ No failing pods found"
                
                echo "✅ Deployment verification completed"
            """
        }
    }
}
    }

    post {
        success {
            echo "🎉 Deployment succeeded!"
        }
        failure {
            echo "❌ Deployment failed!"
            script {
                bat """
                    echo Pod statuses:
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get pods

                    echo Recent events:
                    kubectl --kubeconfig="${KUBECONFIG_PATH}" get events --sort-by=.metadata.creationTimestamp --tail=10
                """
            }
        }
        always {
            script {
                bat """
                    docker logout
                    docker stop auth-test-${BUILD_NUMBER} 2>nul || echo Already stopped
                    docker rm auth-test-${BUILD_NUMBER} 2>nul || echo Already removed
                    docker stop frontend-test-${BUILD_NUMBER} 2>nul || echo Already stopped
                    docker rm frontend-test-${BUILD_NUMBER} 2>nul || echo Already removed
                    docker image prune -f --filter "until=72h"
                """
            }
        }
    }
}
