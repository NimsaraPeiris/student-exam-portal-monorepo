'use client';

import { Typography, Card, Row, Col, Statistic, Space } from 'antd';
import { BookOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';

const { Title, Paragraph } = Typography;

export default function DashboardPage() {
    const { user } = useAuthStore();

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <div>
                    <Title level={2}>Welcome, {user?.full_name || 'Student'}! 👋</Title>
                    <Paragraph type="secondary">
                        Welcome to your dashboard. Here is a quick overview of your progress and available resources.
                    </Paragraph>
                </div>

                <Row gutter={16}>
                    <Col span={8}>
                        <Card variant="borderless">
                            <Statistic
                                title="Enrolled Papers"
                                value={12}
                                prefix={<BookOutlined style={{ color: '#1677ff' }} />}
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card variant="borderless">
                            <Statistic
                                title="Completed Exams"
                                value={5}
                                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                suffix="/ 12"
                            />
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card variant="borderless">
                            <Statistic
                                title="Practice Sessions"
                                value={28}
                                prefix={<FileTextOutlined style={{ color: '#faad14' }} />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card title="Recent Activity" variant="borderless">
                    <Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                        No recent activity found. Start a new exam to track your progress!
                    </Paragraph>
                </Card>
            </Space>
        </div>
    );
}
