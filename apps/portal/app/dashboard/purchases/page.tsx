'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, Card, Typography, Space, App, Row, Col, Skeleton, Tag } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import api from '@/lib/api';
import { Paper, ExamSession } from '@/types';
import { useRouter } from 'next/navigation';

const { Title, Paragraph, Text } = Typography;

export default function PurchasesPage() {
    const router = useRouter();
    const { message } = App.useApp();

    const { data, isLoading } = useQuery<{ data: Paper[] }>({
        queryKey: ['purchased-papers'],
        queryFn: async () => {
            const res = await api.get('/papers/purchased');
            return res.data;
        },
    });

    const papers = data?.data || [];

    const startExamMutation = useMutation({
        mutationFn: async (paperId: string) => {
            const res = await api.post<ExamSession>('/exams/start', { paper_id: paperId });
            return res.data;
        },
        onSuccess: (data) => {
            message.success('Exam session started!');
            router.push(`/dashboard/exams/${data.session_id}`);
        },
        onError: (error: any) => {
            message.error(error.response?.data?.message || 'Failed to start exam');
        },
    });

    return (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
            <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                <Title level={2}>My Purchases</Title>

                {isLoading ? (
                    <Row gutter={[24, 24]}>
                        {[1, 2, 3].map(i => (
                            <Col xs={24} sm={12} md={8} lg={6} key={i}>
                                <Card>
                                    <Skeleton active avatar paragraph={{ rows: 3 }} />
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : papers.length > 0 ? (
                    <Row gutter={[24, 24]}>
                        {papers.map((paper) => (
                            <Col xs={24} sm={12} md={8} lg={6} key={paper.id}>
                                <Card
                                    hoverable
                                    style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                                    actions={[
                                        <Button
                                            type="primary"
                                            key="start"
                                            icon={<PlayCircleOutlined />}
                                            loading={startExamMutation.isPending && startExamMutation.variables === paper.id}
                                            onClick={() => startExamMutation.mutate(paper.id)}
                                            block
                                        >
                                            Start Exam
                                        </Button>
                                    ]}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ marginBottom: 12 }}>
                                            <Tag color={paper.type === 'past_paper' ? 'blue' : 'green'}>
                                                {paper.type === 'past_paper' ? 'Past Paper' : 'Model Paper'}
                                            </Tag>
                                            <Tag color="orange">{paper.exam_board}</Tag>
                                        </div>
                                        <Title level={4} style={{ marginBottom: 8 }}>{paper.title}</Title>
                                        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
                                            Subject: {paper.subject}<br />
                                            Year: {paper.year}
                                        </Paragraph>
                                        <Text type="success" strong>Purchased</Text>
                                    </div>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                ) : (
                    <Card style={{ textAlign: 'center', padding: '60px 0' }}>
                        <Text type="secondary">You haven't purchased any papers yet.</Text>
                        <br />
                        <Button type="primary" style={{ marginTop: 16 }} onClick={() => router.push('/dashboard/papers')}>
                            Browse Papers
                        </Button>
                    </Card>
                )}
            </Space>
        </div>
    );
}
