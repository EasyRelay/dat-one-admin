import { Alert, App, Button, Modal, Segmented, Space, Tag, Tooltip } from 'antd';
import { useEffect, useState } from 'react';
import { extractApiError } from '../../api/client';
import { updateUser } from '../../api/users.api';
import { formModalProps } from '../../theme/modal';
import {
  EXT_FEATURE_KEYS,
  EXT_FEATURE_LABELS,
  type ExtFeatureKey,
  type ExtFeatureMap,
} from '../../types/features';
import type { ExtUser } from '../../types/user';

/** `inherit` = follow the plan. The plan itself only knows on/off. */
type OverrideValue = 'inherit' | 'on' | 'off';

function toOverrideValue(value: boolean | undefined): OverrideValue {
  if (value === true) return 'on';
  if (value === false) return 'off';
  return 'inherit';
}

interface Props {
  open: boolean;
  user: ExtUser;
  /** What the plan alone grants, before any override. */
  planFeatures: ExtFeatureMap;
  onClose: () => void;
  onSaved: (user: ExtUser) => void;
}

/**
 * Per-account feature overrides, on their own screen.
 *
 * Lifted out of the drawer: seven three-way controls is the biggest block on
 * the page and it is the one an admin touches least, so leaving it permanently
 * unfolded buried the things they actually came for. It also saves by itself
 * now — the overrides used to ride along with the name/note form, which meant
 * editing access and pressing the wrong Save left it unapplied.
 */
export function FeatureAccessModal({
  open,
  user,
  planFeatures,
  onClose,
  onSaved,
}: Props) {
  const { message } = App.useApp();
  const [overrides, setOverrides] = useState<
    Partial<Record<ExtFeatureKey, boolean>>
  >({});
  const [saving, setSaving] = useState(false);

  // Re-seeded on every open so a cancelled edit is really cancelled.
  useEffect(() => {
    if (open) setOverrides({ ...(user.featureOverrides ?? {}) });
  }, [open, user]);

  const disabled = !user.isActive || user.removed;
  const changed =
    JSON.stringify(overrides) !==
    JSON.stringify(user.featureOverrides ?? {});

  async function handleSave() {
    setSaving(true);
    try {
      const saved = await updateUser(user.id, {
        featureOverrides: Object.keys(overrides).length > 0 ? overrides : null,
      });
      void message.success('Feature access saved');
      onSaved(saved);
      onClose();
    } catch (err) {
      void message.error(extractApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Feature access"
      open={open}
      onCancel={onClose}
      width={520}
      destroyOnHidden
      {...formModalProps}
      footer={[
        <Button key="reset" onClick={() => setOverrides({})} disabled={saving}>
          Follow the plan for everything
        </Button>,
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={saving}
          disabled={!changed}
          onClick={() => void handleSave()}
        >
          Save
        </Button>,
      ]}
    >
      <p className="cell-sub" style={{ marginTop: 0 }}>
        <strong>{user.email}</strong> — “Plan” follows whatever the plan grants;
        On and Off override it for this account alone.
      </p>

      {disabled ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          title={
            user.removed
              ? 'Account is archived — every feature is off regardless of what is set here.'
              : 'Account is disabled — every feature is off regardless of what is set here.'
          }
        />
      ) : null}

      <div className="feature-grid">
        {EXT_FEATURE_KEYS.map((key) => {
          const override = overrides[key];
          const effective = disabled ? false : (override ?? planFeatures[key]);
          return (
            <div className="feature-row" key={key}>
              <span className="feature-name">
                {EXT_FEATURE_LABELS[key]}
                <Tooltip
                  title={
                    override === undefined
                      ? 'Follows the plan'
                      : 'Overridden for this account'
                  }
                >
                  <Tag
                    color={effective ? 'green' : 'default'}
                    style={{ marginLeft: 8 }}
                  >
                    {effective ? 'on' : 'off'}
                  </Tag>
                </Tooltip>
              </span>
              <Segmented
                size="small"
                value={toOverrideValue(override)}
                options={[
                  { value: 'inherit', label: 'Plan' },
                  { value: 'on', label: 'On' },
                  { value: 'off', label: 'Off' },
                ]}
                onChange={(value) => {
                  setOverrides((prev) => {
                    const next = { ...prev };
                    if (value === 'inherit') delete next[key];
                    else next[key] = value === 'on';
                    return next;
                  });
                }}
              />
            </div>
          );
        })}
      </div>

      <Space style={{ marginTop: 12 }} size={6} wrap>
        <span className="cell-sub">
          {Object.keys(overrides).length === 0
            ? 'No overrides — this account follows its plan.'
            : `${Object.keys(overrides).length} override(s) on this account.`}
        </span>
      </Space>
    </Modal>
  );
}
