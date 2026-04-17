pipeline {
    agent any

    options {
        ansiColor('xterm')
        disableConcurrentBuilds()
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '20'))
    }

    parameters {
        string(
            name: 'BRANCH_TO_DEPLOY',
            defaultValue: '',
            description: 'Optional: specify a branch name to build and deploy as DEV. If empty, standard CI logic applies (main = prod, dev = dev).'
        )
        booleanParam(
            name: 'SKIP_TRIVY',
            defaultValue: false,
            description: 'Skip Trivy security scan (use only in emergencies).'
        )
    }

    environment {
        SERVICE = "keitaro_api_ts"
        GIT_REPO_URL = 'git@github.com:0xTec/keitaro_api_ts.git'
        GIT_CREDENTIAL = "0xTec_Github"
        DOCKER_REGISTRY = credentials('DOCKER_REGISTRY')
        DOCKER_REGISTRY_CREDENTIAL = "aws-ecr-creds"
        AWS_REGION = "eu-central-1"
        PROJECT_PATH = "."

        SERVER_HOST = credentials('SERVER_HOST')
        SERVER_USER = "developer"
        DEPLOY_PATH = "/home/developer/repositories/keitaro_api_ts"
        SSH_KEY_ID = "deploy-ssh-key"

        TELEGRAM_BOT_TOKEN = credentials('TELEGRAM_BOT_TOKEN')
        TELEGRAM_CHAT_ID   = credentials('TELEGRAM_CHAT_ID')

        TRIVY_IMAGE = "aquasec/trivy:${env.TRIVY_IMAGE_TAG ?: '0.70.0'}"
        TRIVY_CACHE_DIR = '/tmp/trivy-cache'
    }

    stages {
        stage('Checkout code') {
            steps {
                script {
                    env.LAST_STAGE = env.STAGE_NAME
                    if (params.BRANCH_TO_DEPLOY?.trim()) {
                        env.BUILD_BRANCH = params.BRANCH_TO_DEPLOY.trim()
                        echo "Manual build: branch '${env.BUILD_BRANCH}' selected."
                    } else if (env.BRANCH_NAME) {
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
                    env.LAST_STAGE = env.STAGE_NAME
                    if (params.BRANCH_TO_DEPLOY?.trim()) {
                        env.IMAGE_TAG = 'dev'
                        env.DEPLOY_ENV = 'development'
                        env.COMPOSE_FILE = 'docker-compose.dev.yml'
                        env.COMPOSE_PROJECT = 'keitaro_api_ts_dev'
                        env.DOCKERFILE = 'Dockerfile.dev'
                        echo "Manual run: forcing DEV environment for branch ${env.BUILD_BRANCH}"
                    } else if (env.BUILD_BRANCH == 'main' || env.BUILD_BRANCH == 'master') {
                        env.IMAGE_TAG = 'prod'
                        env.DEPLOY_ENV = 'production'
                        env.COMPOSE_FILE = 'docker-compose.prod.yml'
                        env.COMPOSE_PROJECT = 'keitaro_api_ts_prod'
                        env.DOCKERFILE = 'Dockerfile'
                    } else if (env.BUILD_BRANCH == 'dev') {
                        env.IMAGE_TAG = 'dev'
                        env.DEPLOY_ENV = 'development'
                        env.COMPOSE_FILE = 'docker-compose.dev.yml'
                        env.COMPOSE_PROJECT = 'keitaro_api_ts_dev'
                        env.DOCKERFILE = 'Dockerfile.dev'
                    } else {
                        echo "No building job for branch: ${env.BUILD_BRANCH}"
                    }

                    env.SHA_TAG = "sha-${env.GIT_COMMIT_SHORT}"
                    env.LOCAL_BUILD_IMAGE = "${env.SERVICE}:build-${env.BUILD_NUMBER}"

                    echo """
                    Build configuration:
                      Branch: ${env.BUILD_BRANCH}
                      Image tag: ${env.IMAGE_TAG}
                      Environment: ${env.DEPLOY_ENV}
                      Compose file: ${env.COMPOSE_FILE}
                      Dockerfile: ${env.DOCKERFILE}
                    """
                }
            }
        }

        stage('Login to AWS ECR') {
            steps {
                script { env.LAST_STAGE = env.STAGE_NAME }
                withAWS(credentials: DOCKER_REGISTRY_CREDENTIAL, region: AWS_REGION) {
                    sh '''
                        echo "Logging in to AWS ECR..."
                        aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $DOCKER_REGISTRY
                    '''
                }
            }
        }

        stage('Docker build') {
            when {
                expression { return env.IMAGE_TAG }
            }
            steps {
                script {
                    env.LAST_STAGE = env.STAGE_NAME
                    docker.build(env.LOCAL_BUILD_IMAGE, "-f ${env.DOCKERFILE} ${PROJECT_PATH}")
                }
            }
        }

        stage('Trivy scan') {
            when {
                allOf {
                    expression { return env.IMAGE_TAG }
                    expression { return !params.SKIP_TRIVY }
                }
            }
            steps {
                script { env.LAST_STAGE = env.STAGE_NAME }
                sh """
                    mkdir -p ${env.TRIVY_CACHE_DIR}

                    echo "=== Trivy: scanning for CRITICAL & HIGH vulnerabilities ==="
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v ${env.TRIVY_CACHE_DIR}:/root/.cache/ \
                        ${env.TRIVY_IMAGE} image \
                        --scanners vuln,secret \
                        --ignore-unfixed \
                        --skip-dirs usr/local/lib/node_modules/npm \
                        --skip-dirs opt/yarn-v1.22.22 \
                        --exit-code 1 \
                        --severity CRITICAL,HIGH \
                        --format table \
                        --no-progress \
                        ${env.LOCAL_BUILD_IMAGE}

                    echo "=== Trivy: full informational report (all severities) ==="
                    docker run --rm \
                        -v /var/run/docker.sock:/var/run/docker.sock \
                        -v ${env.TRIVY_CACHE_DIR}:/root/.cache/ \
                        ${env.TRIVY_IMAGE} image \
                        --scanners vuln,secret \
                        --skip-dirs usr/local/lib/node_modules/npm \
                        --skip-dirs opt/yarn-v1.22.22 \
                        --exit-code 0 \
                        --format table \
                        --no-progress \
                        ${env.LOCAL_BUILD_IMAGE}
                """
            }
        }

        stage('Push to ECR') {
            when {
                expression { return env.IMAGE_TAG }
            }
            steps {
                script {
                    env.LAST_STAGE = env.STAGE_NAME
                    sh """
                        docker tag ${env.LOCAL_BUILD_IMAGE} ${DOCKER_REGISTRY}/${SERVICE}:${IMAGE_TAG}
                        docker tag ${env.LOCAL_BUILD_IMAGE} ${DOCKER_REGISTRY}/${SERVICE}:${SHA_TAG}
                        docker push ${DOCKER_REGISTRY}/${SERVICE}:${IMAGE_TAG}
                        docker push ${DOCKER_REGISTRY}/${SERVICE}:${SHA_TAG}
                    """
                }
            }
        }

        stage('Deploy to server') {
            when {
                anyOf {
                    expression { return params.BRANCH_TO_DEPLOY?.trim() }
                    branch 'main'
                    branch 'master'
                    branch 'dev'
                }
            }
            steps {
                script { env.LAST_STAGE = env.STAGE_NAME }
                withCredentials([
                    [$class: 'AmazonWebServicesCredentialsBinding',
                     credentialsId: 'aws-ecr-creds',
                     accessKeyVariable: 'AWS_ACCESS_KEY_ID',
                     secretKeyVariable: 'AWS_SECRET_ACCESS_KEY']
                    ]) {
                    sshagent(credentials: [SSH_KEY_ID]) {                        
                        sh """
                            echo "Connecting to deployment server via SSH..."
                            ssh -o StrictHostKeyChecking=no \$SERVER_USER@\$SERVER_HOST '
                                set -e

                                export AWS_REGION="${AWS_REGION}"
                                export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}"
                                export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}"
                                export DOCKER_REGISTRY="${DOCKER_REGISTRY}"
                                export SERVICE="${SERVICE}"
                                export IMAGE_TAG="${IMAGE_TAG}"
                                export COMPOSE_FILE="${COMPOSE_FILE}"
                                export COMPOSE_PROJECT="${env.COMPOSE_PROJECT}"

                                cd ${DEPLOY_PATH}

                                aws ecr get-login-password --region \$AWS_REGION | docker login --username AWS --password-stdin \$DOCKER_REGISTRY
                                docker pull \$DOCKER_REGISTRY/\$SERVICE:\$IMAGE_TAG

                                echo "Stopping existing services..."
                                docker compose -f \$COMPOSE_FILE down || true

                                echo "Starting services with docker compose..."
                                docker compose -f \$COMPOSE_FILE -p \$COMPOSE_PROJECT up -d

                                echo "Pruning dangling images..."
                                docker image prune -f || true

                                echo "Deployment completed successfully for \$IMAGE_TAG!"
                            '
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                sh "docker rmi ${env.LOCAL_BUILD_IMAGE} || true"
            }
            echo "Pipeline finished"
        }
        success {
            script {
                def branch = env.BUILD_BRANCH ?: env.BRANCH_NAME ?: 'unknown'
                def imageTag = env.IMAGE_TAG ?: 'N/A'
                def trivyStatus = params.SKIP_TRIVY ? '⏭ skipped' : '✅ passed'
                def message = """
✅ *SUCCESS: '${env.JOB_NAME}' completed!*
━━━━━━━━━━━━━━━━━━━━━━━
🔨 *Job/Build:* [${env.JOB_NAME} #${env.BUILD_NUMBER}](${env.BUILD_URL})
🌿 *Branch:* ${branch}
🏷️ *Image tag:* ${imageTag}
🛡 *Trivy:* ${trivyStatus}
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
                def failedStage = env.LAST_STAGE ?: 'unknown'
                def message = """
❌ *FAILURE: '${env.JOB_NAME}' failed!* @artem\\_full\\_stack
━━━━━━━━━━━━━━━━━━━━━━━
🔨 *Job/Build:* [${env.JOB_NAME} #${env.BUILD_NUMBER}](${env.BUILD_URL})
🌿 *Branch:* ${branch}
🏷️ *Image tag:* ${imageTag}
💥 *Failed at:* ${failedStage}
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
