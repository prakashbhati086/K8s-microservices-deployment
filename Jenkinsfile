pipeline {
  agent any
  environment {
    DOCKERHUB = 'prakashbhati086'
    DOCKER_CREDS = credentials('docker-credentials')
    KUBECONFIG_PATH = 'C:\\Users\\Prakash Bhati\\.kube\\config'
    COMMIT = "${env.BUILD_NUMBER}"
  }
  stages {
    stage('Checkout') { 
      steps { 
        checkout scm 
      } 
    }
    stage('Docker Login') {
      steps { 
        bat "echo %DOCKER_CREDS_PSW% | docker login -u %DOCKER_CREDS_USR% --password-stdin" 
      }
    }
    stage('Build & Push Images') {
      parallel {
        stage('auth-service') {
          steps {
            dir('auth-service') {
              bat """
                docker build -t %DOCKERHUB%/micro-simple-auth:%COMMIT% -t %DOCKERHUB%/micro-simple-auth:latest .
                docker push %DOCKERHUB%/micro-simple-auth:%COMMIT%
                docker push %DOCKERHUB%/micro-simple-auth:latest
              """
            }
          }
        }
        stage('web-service') {
          steps {
            dir('web-service') {
              bat """
                docker build -t %DOCKERHUB%/micro-simple-web:%COMMIT% -t %DOCKERHUB%/micro-simple-web:latest .
                docker push %DOCKERHUB%/micro-simple-web:%COMMIT%
                docker push %DOCKERHUB%/micro-simple-web:latest
              """
            }
          }
        }
      }
    }
    stage('Deploy to Kubernetes') {
  steps {
    bat """
      REM Deploy MongoDB first
      kubectl --kubeconfig="%KUBECONFIG_PATH%" apply -f mongo-service/k8s/
      kubectl --kubeconfig="%KUBECONFIG_PATH%" rollout status deployment/mongodb --timeout=300s
      
      REM Deploy auth-service with MongoDB dependency
      kubectl --kubeconfig="%KUBECONFIG_PATH%" apply -f auth-service/k8s/deployment.yml
      kubectl --kubeconfig="%KUBECONFIG_PATH%" set image deployment/auth-service auth-service=%DOCKERHUB%/micro-simple-auth:%COMMIT%

      REM Deploy web-service
      kubectl --kubeconfig="%KUBECONFIG_PATH%" apply -f web-service/k8s/deployment.yml
      kubectl --kubeconfig="%KUBECONFIG_PATH%" set image deployment/web-service web-service=%DOCKERHUB%/micro-simple-web:%COMMIT%

      REM Wait for rollouts
      kubectl --kubeconfig="%KUBECONFIG_PATH%" rollout status deployment/auth-service --timeout=180s
      kubectl --kubeconfig="%KUBECONFIG_PATH%" rollout status deployment/web-service --timeout=180s
    """
  }
}

  }
  post {
    success { 
      echo "Deployed successfully. Access via NodePort or port-forward." 
    }
    failure { 
      echo "Deployment failed. Check the logs for details." 
    }
  }
}
