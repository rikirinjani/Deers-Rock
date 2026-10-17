#!/bin/bash
set -e
# Generate a keypair on the box for the benchmark user
if [ ! -f /root/.ssh/id_ed25519 ]; then
 ssh-keygen -t ed25519 -N '' -f /root/.ssh/id_ed25519 -q
fi
# Add the operator's local public key (we'll fetch it) - for now add the box's own key
cat /root/.ssh/id_ed25519.pub >> /root/.ssh/authorized_keys
chmod 700 /root/.ssh; chmod 600 /root/.ssh/authorized_keys
# Disable password auth
sed -i 's/^PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#PubkeyAuthentication.*/PubkeyAuthentication yes/' /etc/ssh/sshd_config
systemctl reload sshd
echo 'SSH secured: key-based only'
