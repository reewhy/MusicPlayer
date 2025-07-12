// components/ConfirmDialog.vue
<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
          v-if="state.isVisible"
          class="confirm-overlay"
          @click="handleOverlayClick"
          @keydown.esc="handleCancel"
          tabindex="0"
      >
        <div class="confirm-dialog" @click.stop>
          <div class="confirm-header">
            <h3 class="confirm-title">{{ state.title }}</h3>
          </div>

          <div class="confirm-body">
            <div class="confirm-icon" :class="`confirm-icon--${state.type}`">
              <svg v-if="state.type === 'default'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                <circle cx="12" cy="17" r="0.1"/>
              </svg>

              <svg v-if="state.type === 'danger'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <circle cx="12" cy="16" r="0.1"/>
              </svg>

              <svg v-if="state.type === 'warning'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <circle cx="12" cy="17" r="0.1"/>
              </svg>

              <svg v-if="state.type === 'success'" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22,4 12,14.01 9,11.01"/>
              </svg>
            </div>
            <p class="confirm-message">{{ state.message }}</p>
          </div>

          <div class="confirm-actions">
            <button
                @click="handleCancel"
                class="confirm-btn confirm-btn--cancel"
                :disabled="state.loading"
            >
              {{ state.cancelText }}
            </button>
            <button
                @click="handleConfirm"
                class="confirm-btn confirm-btn--confirm"
                :class="`confirm-btn--${state.type}`"
                :disabled="state.loading"
            >
              <span v-if="state.loading" class="loading-spinner"></span>
              {{ state.confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useConfirm } from '@/composables/useConfirm';

const { state, handleConfirm, handleCancel, handleOverlayClick } = useConfirm();
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
}

.confirm-dialog {
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(71, 85, 105, 0.5);
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  max-width: 400px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
}

.confirm-header {
  padding: 24px 24px 0;
}

.confirm-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #f1f5f9;
  text-align: center;
}

.confirm-body {
  padding: 16px 24px;
  text-align: center;
}

.confirm-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-icon--default {
  background: rgba(79, 70, 229, 0.2);
  color: #a78bfa;
}

.confirm-icon--danger {
  background: rgba(239, 68, 68, 0.2);
  color: #fca5a5;
}

.confirm-icon--warning {
  background: rgba(245, 158, 11, 0.2);
  color: #fbbf24;
}

.confirm-icon--success {
  background: rgba(34, 197, 94, 0.2);
  color: #86efac;
}

.confirm-message {
  margin: 0;
  color: #94a3b8;
  font-size: 14px;
  line-height: 1.5;
}

.confirm-actions {
  padding: 16px 24px 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 80px;
  justify-content: center;
  transform: translateY(0);
}

.confirm-btn:hover:not(:disabled) {
  transform: translateY(-1px);
}

.confirm-btn:active:not(:disabled) {
  transform: translateY(0);
}

.confirm-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.confirm-btn--cancel {
  background: rgba(71, 85, 105, 0.6);
  color: #cbd5e1;
  border: 1px solid rgba(71, 85, 105, 0.8);
}

.confirm-btn--cancel:hover:not(:disabled) {
  background: rgba(71, 85, 105, 0.8);
  border-color: rgba(71, 85, 105, 1);
}

.confirm-btn--confirm {
  color: white;
  position: relative;
  overflow: hidden;
}

.confirm-btn--confirm::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  transform: translateX(-100%);
  transition: transform 0.6s;
}

.confirm-btn--confirm:hover:not(:disabled)::before {
  transform: translateX(100%);
}

.confirm-btn--default {
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
}

.confirm-btn--default:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca, #6d28d9);
  box-shadow: 0 6px 16px rgba(79, 70, 229, 0.6);
}

.confirm-btn--danger {
  background: linear-gradient(135deg, #dc2626, #ef4444);
  box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
}

.confirm-btn--danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #b91c1c, #dc2626);
  box-shadow: 0 6px 16px rgba(220, 38, 38, 0.6);
}

.confirm-btn--warning {
  background: linear-gradient(135deg, #d97706, #f59e0b);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.4);
}

.confirm-btn--warning:hover:not(:disabled) {
  background: linear-gradient(135deg, #b45309, #d97706);
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.6);
}

.confirm-btn--success {
  background: linear-gradient(135deg, #059669, #10b981);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.4);
}

.confirm-btn--success:hover:not(:disabled) {
  background: linear-gradient(135deg, #047857, #059669);
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.6);
}

.loading-spinner {
  width: 14px;
  height: 14px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modal transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .confirm-dialog,
.modal-leave-active .confirm-dialog {
  transition: transform 0.3s ease;
}

.modal-enter-from .confirm-dialog,
.modal-leave-to .confirm-dialog {
  transform: scale(0.9) translateY(-10px);
}

/* Ensure backdrop-filter works properly across browsers */
@supports not (backdrop-filter: blur(24px)) {
  .confirm-dialog {
    background: rgba(30, 41, 59, 0.98);
  }

  .confirm-overlay {
    background: rgba(0, 0, 0, 0.8);
  }
}
</style>