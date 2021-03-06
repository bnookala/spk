export const chartTemplate = `description: Simple Helm Chart For Integration Tests
name: @@CHART_APP_NAME@@-app
version: 0.1.0`;

export const valuesTemplate = `# Default values for test app.
# This is a YAML-formatted file.
# Declare variables to be passed into your templates.

image:
  repository: @@ACR_NAME@@.azurecr.io/@@CHART_APP_NAME@@
  tag: latest
  pullPolicy: IfNotPresent

serviceName: "service"

service:
  type: ClusterIP
  port: 80
  containerPort: 8080
`;

export const mainTemplate = `---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: {{ .Values.serviceName }}
  minReadySeconds: {{ .Values.minReadySeconds }}
  strategy:
    type: RollingUpdate # describe how we do rolling updates
    rollingUpdate:
      maxUnavailable: 1 # When updating take one pod down at a time
      maxSurge: 1 # When updating never have more than one extra pod. If replicas = 2 then never 3 pods when updating
  template:
    metadata:
      labels:
        app: {{ .Values.serviceName }}
    spec:
      containers:
        - name: {{ .Values.serviceName }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          imagePullPolicy: {{ .Values.image.pullPolicy }}
          ports:
            - containerPort: {{ .Values.service.containerPort }}
---
apiVersion: v1
kind: Service
metadata:
  name: {{ .Values.serviceName }}
spec:
  ports:
    - port: {{ .Values.service.port }}
      protocol: TCP
  selector:
    app: {{ .Values.serviceName }}
`;
