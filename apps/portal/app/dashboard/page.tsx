'use client';

import { Typography, Card, Row, Col, Statistic, Space, List, Tag, Spin, Button, Result, Divider, Skeleton } from 'antd';
import { BookOutlined, FileTextOutlined, CheckCircleOutlined, ArrowRightOutlined, ClockCircleOutlined, PlayCircleOutlined, LineChartOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { ExamHistory } from '@/types';
import dayjs from 'dayjs';

const { Title, Paragraph, Text } = Typography;

export default function DashboardPage() {
    const { user } = useAuthStore();

    const { data: recentExams, isLoading } = useQuery<ExamHistory[]>({
        queryKey: ['recent-exams'],
        queryFn: async () => {
            const response = await api.get('/exams');
            return response.data;
        }
    });

    const { data: stats, isLoading: isLoadingStats } = useQuery({
        queryKey: ['exam-stats'],
        queryFn: async () => {
            const response = await api.get('/exams/stats');
            return response.data;
        }
    });

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
                            <Skeleton loading={isLoadingStats} active avatar={false} paragraph={{ rows: 1 }}>
                                <Statistic
                                    title="Enrolled Papers"
                                    value={stats?.enrolled_count || 0}
                                    prefix={<BookOutlined style={{ color: '#1677ff' }} />}
                                />
                            </Skeleton>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card variant="borderless">
                            <Skeleton loading={isLoadingStats} active avatar={false} paragraph={{ rows: 1 }}>
                                <Statistic
                                    title="Completed Exams"
                                    value={stats?.completed_count || 0}
                                    prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                                    suffix={`/ ${stats?.total_available_papers || 0}`}
                                />
                            </Skeleton>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card variant="borderless">
                            <Skeleton loading={isLoadingStats} active avatar={false} paragraph={{ rows: 1 }}>
                                <Statistic
                                    title="Average Performance"
                                    value={stats?.average_score || 0}
                                    precision={1}
                                    suffix="%"
                                    prefix={<LineChartOutlined style={{ color: '#faad14' }} />}
                                />
                            </Skeleton>
                        </Card>
                    </Col>
                </Row>

                <Card title="Recent Activity" variant="borderless" style={{ minHeight: 300 }}>
                    {isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                            <Spin size="large" />
                        </div>
                    ) : recentExams && recentExams.length > 0 ? (
                        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                            {recentExams.map((exam) => {
                                const isDraft = exam.status === 'in_progress';
                                const rawDate = isDraft ? exam.started_at : exam.submitted_at;
                                const dateStr = typeof rawDate === 'string' && !rawDate.endsWith('Z') && !rawDate.includes('+') ? rawDate.replace(' ', 'T') + 'Z' : rawDate;

                                return (
                                    <div
                                        key={exam.session_id}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            padding: '12px 0',
                                            borderBottom: '1px solid #f0f0f0'
                                        }}
                                    >
                                        <Space size="large">
                                            {isDraft ? (
                                                <ClockCircleOutlined style={{ fontSize: 24, color: '#faad14' }} />
                                            ) : (
                                                <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />
                                            )}
                                            <Space orientation="vertical" size={2}>
                                                <Space>
                                                    <Text strong>{exam.title}</Text>
                                                    {isDraft && <Tag color="orange">In Progress</Tag>}
                                                </Space>
                                                <Space separator={<Text type="secondary">•</Text>}>
                                                    <Text type="secondary">{exam.subject} ({exam.exam_board})</Text>
                                                    <Text type="secondary">
                                                        {isDraft ? 'Started on ' : 'Submitted on '}
                                                        {dayjs(dateStr).format('MMM D, YYYY h:mm A')}
                                                    </Text>
                                                </Space>
                                            </Space>
                                        </Space>

                                        <Button
                                            type={isDraft ? "primary" : "link"}
                                            href={`/dashboard/exams/${exam.session_id}`}
                                            icon={isDraft ? <PlayCircleOutlined /> : <ArrowRightOutlined />}
                                        >
                                            {isDraft ? 'Continue Exam' : 'View Details'}
                                        </Button>
                                    </div>
                                );
                            })}
                        </Space>
                    ) : (
                        <Result
                            status="info"
                            title="No recent activity yet"
                            subTitle="Start practicing by taking an exam to track your progress!"
                            extra={
                                <Button type="primary" href="/dashboard/papers">
                                    Browse Papers
                                </Button>
                            }
                        />
                    )}
                </Card>
            </Space>
        </div>
    );
}
