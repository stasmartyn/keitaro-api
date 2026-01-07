pipeline {
    agent any

    options {
        ansiColor('xterm')
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20'))
    }

    environment {
        SERVICE = "keitaro_api_ts"
        CONTAINER_PORT_INTERNAL = "5006"
        GIT_REPO_URL = 'git@github.com:TBAppTech/keitaro_api_ts.git'
        GIT_CREDENTIAL = "TBAppTech_GitHub"
        DOCKER_REGISTRY = "857235393156.dkr.ecr.eu-central-1.amazonaws.com"
        DOCKER_REGISTRY_CREDENTIAL = "aws-ecr-creds"
        AWS_REGION = "eu-central-1"
        PROJECT_PATH = "."

        SERVER_HOST = "135.181.132.125"
        SERVER_USER = "developer"
        DEPLOY_PATH = "/home/developer/repositories/keitaro_api_ts"
        SSH_KEY_ID = "deploy-ssh-key"

        TELEGRAM_BOT_TOKEN = credentials('TELEGRAM_BOT_TOKEN')
        TELEGRAM_CHAT_ID   = credentials('TELEGRAM_CHAT_ID')
    }

    stages {
        stage('Checkout code') {
            steps {
                script {
                    if (env.BRANCH_NAME) {
                        env.BUILD_BRANCH = env.BRANCH_NAME
                    } else if (env.CHANGE_BRANCH) {
                        env.BUILD_BRANCH = env.CHANGE_BRANCH
                    } else if (env.GIT_BRANCH) {
                        env.BUILD_BRANCH = env.GIT_BRANCH.replaceAll('origin/', '')
                    } else {
                        env.BUILD_BRANCH = 'main'
                    }
                    echo "Building branch: ${env.BUILD_BRANCH}"

                    env.GIT_COMMIT_SHORT = sh(returnStdout: true, script: 'git rev-parse --short HEAD').trim()
                }

                checkout([$class: 'GitSCM',
                    branches: [[name: "*/${env.BUILD_BRANCH}"]],
                    userRemoteConfigs: [[
                        url: "${env.GIT_REPO_URL}",
                        credentialsId: "${env.GIT_CREDENTIAL}"
                    ]]
                ])
            }
        }

        stage('Set image tag') {
            steps {
                script {
                    if (env.BUILD_BRANCH == 'main' || env.BUILD_BRANCH == 'master') {
                        env.IMAGE_TAG = 'prod'
                        env.DEPLOY_ENV = 'production'
                        env.SERVICE_PORT= '5006'
                        env.ENV_FILE= '.env'
                    } else if (env.BUILD_BRANCH == 'dev') {
                        env.IMAGE_TAG = 'dev'
                        env.DEPLOY_ENV = 'development'
                        env.SERVICE_PORT= '5007'
                        env.ENV_FILE='.env.dev'
                    } else {
                        echo "No building job for branch: ${env.BUILD_BRANCH}"
                    }

                    env.SHA_TAG = "sha-${env.GIT_COMMIT_SHORT}"
                    env.CONTAINER_NAME = "${env.SERVICE}-${env.IMAGE_TAG}"
                    echo "Image tag: ${env.IMAGE_TAG}"
                    echo "SHA tag: ${env.SHA_TAG}"
                    echo "Deploy environment: ${env.DEPLOY_ENV}"
                }
            }
        }
        stage('Login to AWS ECR') {
            steps {
                withAWS(credentials: DOCKER_REGISTRY_CREDENTIAL, region: AWS_REGION) {
                    sh '''
                        echo "Logging in to AWS ECR..."
                        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $DOCKER_REGISTRY
                    '''
                }
            }
        }

        stage('Docker build') {
            steps {
                script {
                    docker.withRegistry("https://${DOCKER_REGISTRY}") {
                        def app = docker.build("${DOCKER_REGISTRY}/${SERVICE}:${IMAGE_TAG}", PROJECT_PATH)
                        app.push()
                        app.push("${SHA_TAG}")
                    }
                }
            }
        }

        stage('Deploy to server') {
            steps {
                withCredentials([
                    [$class: 'AmazonWebServicesCredentialsBinding',
                     credentialsId: 'aws-ecr-creds',
                     accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                     secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']
                    ]) {
                    sshagent(credentials: [SSH_KEY_ID]) {                        
                        sh """
                            echo "Connecting to deployment server via SSH..."
                            ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_HOST '
                                set -e

                                export AWS_REGION="${AWS_REGION}"
                                export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                                export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                                export DOCKER_REGISTRY="${DOCKER_REGISTRY}"
                                export SERVICE="${SERVICE}"
                                export SERVICE_PORT="${SERVICE_PORT}"
                                export IMAGE_TAG="${IMAGE_TAG}"
                                export CONTAINER_NAME="${SERVICE}-${IMAGE_TAG}"
                                export ENV_FILE="${ENV_FILE}"

                                cd ${DEPLOY_PATH}

                                aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $DOCKER_REGISTRY
                                docker pull $DOCKER_REGISTRY/$SERVICE:$IMAGE_TAG || docker pull $DOCKER_REGISTRY/$SERVICE:${SHA_TAG}

                                echo "Stopping existing container if running..."
                                docker ps -q --filter "name=^${CONTAINER_NAME}\$" | grep -q . && docker rm -f $CONTAINER_NAME || true

                                echo "Starting container..."
                                docker run --name $CONTAINER_NAME -d \
                                  --restart unless-stopped \
                                  -p $SERVICE_PORT:$CONTAINER_PORT_INTERNAL \
                                  --env-file $ENV_FILE \
                                  $DOCKER_REGISTRY/$SERVICE:$IMAGE_TAG

                                echo "Pruning dangling images..."
                                docker image prune -f || true

                                echo "Deployment completed successfully for $IMAGE_TAG!"
                            '
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished"
        }
        success {
            script {
                def branch = env.BUILD_BRANCH ?: env.BRANCH_NAME ?: 'unknown'
                def imageTag = env.IMAGE_TAG ?: 'N/A'
                def message = """
✅ *SUCCESS: '${env.JOB_NAME}' completed!*
━━━━━━━━━━━━━━━━━━━━━━━
🔨 *Job/Build:* [${env.JOB_NAME} #${env.BUILD_NUMBER}](${env.BUILD_URL})
🌿 *Branch:* ${branch}
🏷️ *Image tag:* ${imageTag}
⏱ *Duration:* ${currentBuild.durationString}
🔗 [View Logs](${env.BUILD_URL}console)
━━━━━━━━━━━━━━━━━━━━━━━
""".trim()
                sh """
                    curl -s -X POST https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage \
                    -d chat_id=${env.TELEGRAM_CHAT_ID} \
                    -d parse_mode=Markdown \
                    --data-urlencode text="${message}"
                """
            }
        }
        failure {
            script {
                def branch = env.BUILD_BRANCH ?: env.BRANCH_NAME ?: 'unknown'
                def imageTag = env.IMAGE_TAG ?: 'N/A'
                def message = """
❌ *FAILURE: '${env.JOB_NAME}' failed!* @aliens199
━━━━━━━━━━━━━━━━━━━━━━━
🔨 *Job/Build:* [${env.JOB_NAME} #${env.BUILD_NUMBER}](${env.BUILD_URL})
🌿 *Branch:* ${branch}
🏷️ *Image tag:* ${imageTag}
⏱ *Duration:* ${currentBuild.durationString}
🔗 [View Logs](${env.BUILD_URL}console)
━━━━━━━━━━━━━━━━━━━━━━━
""".trim()
                sh """
                    curl -s -X POST https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage \
                    -d chat_id=${env.TELEGRAM_CHAT_ID} \
                    -d parse_mode=Markdown \
                    --data-urlencode text="${message}"
                """
            }
        }
    }
}
