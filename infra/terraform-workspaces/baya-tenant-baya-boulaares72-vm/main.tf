terraform {
  required_providers {
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
  }
}

provider "kubernetes" {
  host                   = var.kube_host
  token                  = var.kube_token
  cluster_ca_certificate = base64decode(var.kube_ca)
}

resource "kubernetes_manifest" "vm" {
  manifest = {
    apiVersion = "kubevirt.io/v1"
    kind       = "VirtualMachine"
    metadata = {
      name      = var.vm_name
      namespace = var.namespace
      labels = {
        "portal/owner"   = "baya"
        "portal/client"  = var.namespace
        "portal/project" = "nextstep-pfe"
      }
    }
    spec = {
      running = true
      template = {
        metadata = {
          labels = { "kubevirt.io/vm" = var.vm_name }
        }
        spec = {
          domain = {
            cpu    = { cores = var.cpu_cores }
            memory = { guest = "${var.ram_gb}Gi" }
            devices = {
              disks = [{
                name = "rootdisk"
                disk = { bus = "virtio" }
              }]
            }
          }
          volumes = [{
            name = "rootdisk"
            containerDisk = {
              image = var.os_image
            }
          }]
        }
      }
    }
  }
}