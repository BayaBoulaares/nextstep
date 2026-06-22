/* avantDataVolume
terraform {
  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }
}

provider "kubectl" {
  host                   = var.kube_host
  token                  = var.kube_token
  cluster_ca_certificate = base64decode(var.kube_ca)
  load_config_file       = false
}

resource "kubectl_manifest" "vm" {
  yaml_body = <<-YAML
    apiVersion: kubevirt.io/v1
    kind: VirtualMachine
    metadata:
      name: ${var.vm_name}
      namespace: ${var.namespace}
      labels:
        portal/owner: baya
        portal/client: ${var.namespace}
        portal/project: nextstep-pfe
        portal/availability-set: ${var.availability_set}
    spec:
      running: true
      instancetype:
        kind: VirtualMachineClusterInstancetype
        name: ${var.instance_type}
      template:
        metadata:
          labels:
            kubevirt.io/vm: ${var.vm_name}
            portal/availability-set: ${var.availability_set}
        spec:
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        portal/availability-set: ${var.availability_set}
                    topologyKey: kubernetes.io/hostname
          domain:
            devices:
              disks:
                - name: rootdisk
                  disk:
                    bus: virtio
                - name: cloudinit
                  disk:
                    bus: virtio
          volumes:
            - name: rootdisk
              containerDisk:
                image: ${var.os_image}
            - name: cloudinit
              cloudInitNoCloud:
                userData: |
                  #cloud-config
                  user: ubuntu
                  password: ${var.vm_password}
                  chpasswd:
                    expire: false
                  ssh_pwauth: true
  YAML
}*/
terraform {
  required_providers {
    kubectl = {
      source  = "gavinbunney/kubectl"
      version = "~> 1.14"
    }
  }
}

provider "kubectl" {
  host                   = var.kube_host
  token                  = var.kube_token
  cluster_ca_certificate = base64decode(var.kube_ca)
  load_config_file       = false
}

resource "kubectl_manifest" "vm" {
  yaml_body = <<-YAML
    apiVersion: kubevirt.io/v1
    kind: VirtualMachine
    metadata:
      name: ${var.vm_name}
      namespace: ${var.namespace}
      labels:
        portal/owner: baya
        portal/client: ${var.namespace}
        portal/project: nextstep-pfe
        portal/availability-set: ${var.availability_set}
    spec:
      running: false
      instancetype:
        kind: VirtualMachineClusterInstancetype
        name: ${var.instance_type}
      dataVolumeTemplates:
        - metadata:
            name: ${var.vm_name}-rootdisk
          spec:
            storage:
              accessModes:
                - ReadWriteOnce
              resources:
                requests:
                  storage: ${var.disk_gb}Gi
              storageClassName: nfs-storage
            sourceRef:
              kind: DataSource
              name: ubuntu-2404
              namespace: openshift-virtualization-os-images
      template:
        metadata:
          labels:
            kubevirt.io/vm: ${var.vm_name}
            portal/availability-set: ${var.availability_set}
        spec:
          affinity:
            podAntiAffinity:
              preferredDuringSchedulingIgnoredDuringExecution:
                - weight: 100
                  podAffinityTerm:
                    labelSelector:
                      matchLabels:
                        portal/availability-set: ${var.availability_set}
                    topologyKey: kubernetes.io/hostname
          domain:
            devices:
              disks:
                - name: rootdisk
                  disk:
                    bus: virtio
                - name: cloudinit
                  disk:
                    bus: virtio
          volumes:
            - name: rootdisk
              dataVolume:
                name: ${var.vm_name}-rootdisk
            - name: cloudinit
              cloudInitNoCloud:
                userData: |
                  #cloud-config
                  user: ubuntu
                  password: ${var.vm_password}
                  chpasswd:
                    expire: false
                  ssh_pwauth: true
  YAML
}