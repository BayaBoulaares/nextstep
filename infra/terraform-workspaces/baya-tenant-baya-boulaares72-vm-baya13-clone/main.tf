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

resource "kubectl_manifest" "vm_clone" {
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
        portal/availability-set: none
        portal/cloned-from: ${var.source_vm_name}
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
              storageClassName: nfs-csi
            source:
              pvc:
                namespace: ${var.namespace}
                name: ${var.source_pvc_name}
      template:
        metadata:
          labels:
            kubevirt.io/vm: ${var.vm_name}
            portal/availability-set: none
            portal/cloned-from: ${var.source_vm_name}
        spec:
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