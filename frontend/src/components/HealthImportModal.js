import React, { useMemo, useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Table,
  Space,
  Tag,
  Alert,
  Select,
  Checkbox,
  Typography,
  Divider,
  message,
} from 'antd';
import { InboxOutlined, ReloadOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { healthAPI } from '../services/api';
import { useTranslation } from 'react-i18next';

const REQUIRED_FIELDS = ['member_name', 'timestamp', 'systolic', 'diastolic'];
const OPTIONAL_FIELDS = ['heart_rate', 'tags', 'note'];

const statusColors = {
  valid: 'green',
  error: 'red',
  skipped_duplicate: 'orange',
  unknown_member: 'geekblue',
};

const HealthImportModal = ({ visible, onClose, onImported }) => {
  const { t } = useTranslation();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [approvedMembers, setApprovedMembers] = useState([]);
  const [memberMappings, setMemberMappings] = useState({});
  const [commitResult, setCommitResult] = useState(null);

  const columnsOptions = useMemo(() => preview?.columns || [], [preview]);

  const statusLabel = (status) => t(`import.status.${status}`, { defaultValue: status });
  const fieldLabel = (field) => t(`import.fields.${field}`, { defaultValue: field });

  const tableColumns = [
    { title: t('import.columns.row'), dataIndex: 'row', width: 60 },
    { title: t('import.columns.member'), dataIndex: ['data', 'member_name'], width: 120 },
    { title: t('import.columns.time'), dataIndex: ['data', 'timestamp'], width: 200 },
    { title: t('import.columns.systolic'), dataIndex: ['data', 'systolic'], width: 100 },
    { title: t('import.columns.diastolic'), dataIndex: ['data', 'diastolic'], width: 100 },
    { title: t('import.columns.heartRate'), dataIndex: ['data', 'heart_rate'], width: 80 },
    {
      title: t('import.columns.status'),
      dataIndex: 'status',
      width: 140,
      render: (status) => <Tag color={statusColors[status] || 'default'}>{statusLabel(status)}</Tag>,
    },
    {
      title: t('import.columns.message'),
      dataIndex: 'messages',
      ellipsis: true,
      render: (msgs) => (msgs || []).join('; '),
    },
  ];

  const handleUpload = async (customMapping = mapping) => {
    if (!file) {
      message.warning(t('import.messages.selectFile'));
      return;
    }
    try {
      setLoading(true);
      // Extract originFileObj if file is wrapped by Ant Design Upload
      const fileToUpload = file.originFileObj || file;
      const resp = await healthAPI.previewImport(fileToUpload, customMapping);
      setPreview(resp.data);
      setMapping(resp.data.mapping || {});
      setCommitResult(null);
      setApprovedMembers([]);
      setMemberMappings({});
    } catch (err) {
      const msg = err.response?.data?.message || t('import.messages.previewFail');
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!preview?.session_id) {
      message.warning(t('import.messages.previewRequired'));
      return;
    }
    try {
      setCommitting(true);
      const resp = await healthAPI.commitImport(preview.session_id, approvedMembers, memberMappings);
      setCommitResult(resp.data);
      message.success(t('import.messages.commitSuccess'));
      if (onImported) {
        onImported();
      }
    } catch (err) {
      const msg = err.response?.data?.message || t('import.messages.commitFail');
      message.error(msg);
    } finally {
      setCommitting(false);
    }
  };

  const extractErrorMessage = async (err, fallback) => {
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text();
        const parsed = JSON.parse(text);
        return parsed.message || fallback;
      } catch (e) {
        return fallback;
      }
    }
    return err?.response?.data?.message || fallback;
  };

  const handleTemplateDownload = async (format) => {
    try {
      const resp = await healthAPI.downloadImportTemplate(format);
      const blob = new Blob([resp.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'excel' ? 'health_records_import_template.xlsx' : 'health_records_import_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = await extractErrorMessage(err, t('import.messages.templateFail'));
      if (format === 'excel') {
        message.warning(t('import.messages.templateExcelFallback'));
        return handleTemplateDownload('csv');
      }
      message.error(msg);
    }
  };

  const handleReportDownload = async () => {
    if (!commitResult?.report) {
      message.warning(t('import.messages.noReport'));
      return;
    }
    try {
      const resp = await healthAPI.downloadImportReport(commitResult.report);
      const blob = new Blob([resp.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'health_import_report.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const msg = await extractErrorMessage(err, t('import.messages.reportFail'));
      message.error(msg);
    }
  };

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setMapping({});
    setApprovedMembers([]);
    setCommitResult(null);
  };

  const handleClose = () => {
    resetState();
    if (onClose) onClose();
  };

  const handleMappingChange = (field, value) => {
    setMapping((prev) => ({ ...prev, [field]: value }));
  };

  const uploadProps = {
    accept: '.csv,.xlsx',
    beforeUpload: (f) => {
      setFile(f);
      return false; // prevent auto upload
    },
    onRemove: () => {
      setFile(null);
      setPreview(null);
      setCommitResult(null);
    },
    fileList: file ? [file] : [],
    maxCount: 1,
  };

  return (
    <Modal
      title={t('import.title')}
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={1000}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Space>
          <Upload.Dragger {...uploadProps} style={{ width: 360 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">{t('import.upload.title')}</p>
            <p className="ant-upload-hint">{t('import.upload.hint')}</p>
          </Upload.Dragger>
          <Space direction="vertical">
            <Button icon={<DownloadOutlined />} onClick={() => handleTemplateDownload('excel')}>
              {t('import.template.excel')}
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => handleTemplateDownload('csv')}>
              {t('import.template.csv')}
            </Button>
            <Button type="primary" loading={loading} onClick={() => handleUpload()} icon={<ReloadOutlined />}>
              {t('import.preview')}
            </Button>
          </Space>
        </Space>

        {columnsOptions.length > 0 && (
          <Alert
            type="info"
            message={t('import.mapping.tip')}
            showIcon
            action={
              <Button size="small" onClick={() => handleUpload(mapping)} loading={loading}>
                {t('import.previewWithMapping')}
              </Button>
            }
          />
        )}

        {columnsOptions.length > 0 && (
          <Space wrap>
            {REQUIRED_FIELDS.concat(OPTIONAL_FIELDS).map((field) => (
              <Space key={field} direction="vertical" size={2}>
                <Typography.Text type={REQUIRED_FIELDS.includes(field) ? 'danger' : undefined}>
                  {fieldLabel(field)}
                </Typography.Text>
                <Select
                  style={{ width: 180 }}
                  allowClear
                  placeholder={t('import.mapping.selectPlaceholder')}
                  value={mapping[field]}
                  onChange={(val) => handleMappingChange(field, val)}
                >
                  {columnsOptions.map((c) => (
                    <Select.Option value={c} key={c}>
                      {c}
                    </Select.Option>
                  ))}
                </Select>
              </Space>
            ))}
          </Space>
        )}

        {preview && (
          <Alert
            type="success"
            message={t('import.previewSummary', {
              total: preview.preview.total_rows,
              valid: preview.preview.valid_count,
              error: preview.preview.error_count,
              skipped: preview.preview.skipped_count,
            })}
            showIcon
          />
        )}

        {preview?.rows && (
          <Table
            size="small"
            dataSource={preview.rows}
            columns={tableColumns}
            rowKey={(r) => r.row}
            pagination={{ pageSize: 5 }}
          />
        )}

        {preview?.unknown_members?.length > 0 && (
          <div>
            <Divider orientation="left">{t('import.unknownMembers.title')}</Divider>
            <Typography.Paragraph type="secondary">
              {t('import.unknownMembers.hint')}
            </Typography.Paragraph>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {preview.unknown_members.map((memberName) => (
                <Space key={memberName} align="start">
                  <Typography.Text strong style={{ width: 120 }}>
                    {memberName}:
                  </Typography.Text>
                  <Select
                    style={{ width: 200 }}
                    placeholder={t('import.unknownMembers.selectExisting')}
                    allowClear
                    value={memberMappings[memberName]}
                    onChange={(val) => {
                      const newMappings = { ...memberMappings };
                      if (val) {
                        newMappings[memberName] = val;
                        // Remove from approved new members if mapped to existing
                        setApprovedMembers(prev => prev.filter(m => m !== memberName));
                      } else {
                        delete newMappings[memberName];
                      }
                      setMemberMappings(newMappings);
                    }}
                  >
                    {(preview.existing_members || []).map((m) => (
                      <Select.Option value={m.id} key={m.id}>
                        {m.name}
                      </Select.Option>
                    ))}
                  </Select>
                  <Checkbox
                    checked={approvedMembers.includes(memberName)}
                    disabled={!!memberMappings[memberName]}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setApprovedMembers(prev => [...prev, memberName]);
                      } else {
                        setApprovedMembers(prev => prev.filter(m => m !== memberName));
                      }
                    }}
                  >
                    {t('import.unknownMembers.createNew')}
                  </Checkbox>
                </Space>
              ))}
            </Space>
          </div>
        )}

        <Space>
          <Button onClick={handleClose}>{t('import.actions.close')}</Button>
          <Button type="primary" loading={committing} onClick={handleCommit} disabled={!preview?.session_id}>
            {t('import.actions.commit')}
          </Button>
          {commitResult && (
            <Button icon={<CheckCircleOutlined />} onClick={handleReportDownload}>
              {t('import.actions.downloadReport')}
            </Button>
          )}
        </Space>
      </Space>
    </Modal>
  );
};

export default HealthImportModal;
