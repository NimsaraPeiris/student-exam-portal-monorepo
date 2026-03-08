'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, Typography, Space, Radio, Button, Spin, Result, App, Row, Col, Statistic, Layout, theme, Divider, Tag } from 'antd';
import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Question, AnswerResponse, SubmissionResponse } from '@/types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Sider, Content } = Layout;

type SessionDetails = {
    id: string;
    status: string;
    started_at: string;
    expires_at: string;
    answers: Record<string, string>;
};

export default function ExamPage() {
    const { id: sessionId } = useParams();
    const router = useRouter();
    const { message } = App.useApp();
    const queryClient = useQueryClient();
    const { token } = theme.useToken();

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
    const [examResult, setExamResult] = useState<SubmissionResponse | null>(null);

    // Fetch Session Details
    const { data: sessionDetails, isLoading: isLoadingSession, error: sessionError } = useQuery<SessionDetails>({
        queryKey: ['exam-session', sessionId],
        queryFn: async () => {
            const res = await api.get(`/exams/sessions/${sessionId}`);
            return res.data;
        },
        enabled: !!sessionId && !examResult,
    });

    // Initialize answers from session
    useEffect(() => {
        if (sessionDetails && sessionDetails.answers && Object.keys(localAnswers).length === 0) {
            setLocalAnswers(sessionDetails.answers);
        }
    }, [sessionDetails]);

    const getUtcTime = (dateStr: string) => {
        const str = typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+') ? dateStr.replace(' ', 'T') + 'Z' : dateStr;
        return new Date(str).getTime();
    };

    const hasTimeEnded = sessionDetails ? new Date().getTime() >= getUtcTime(sessionDetails.expires_at) : false;

    // Fetch Analytics if submitted and time ended
    const { data: analytics, isLoading: isLoadingAnalytics } = useQuery({
        queryKey: ['exam-analytics', sessionId],
        queryFn: async () => {
            const res = await api.get(`/exams/sessions/${sessionId}/analytics`);
            return res.data;
        },
        enabled: sessionDetails?.status === 'submitted' && hasTimeEnded,
    });

    // Fetch Review Data if submitted and time ended
    const { data: reviewData, isLoading: isLoadingReview } = useQuery<any[]>({
        queryKey: ['exam-review', sessionId],
        queryFn: async () => {
            const res = await api.get(`/exams/sessions/${sessionId}/review`);
            return res.data;
        },
        enabled: sessionDetails?.status === 'submitted' && hasTimeEnded,
    });

    // Fetch Questions
    const { data: questions, isLoading: isLoadingQuestions } = useQuery<Question[]>({
        queryKey: ['exam-questions', sessionId],
        queryFn: async () => {
            const res = await api.get(`/exams/${sessionId}/questions`);
            return res.data;
        },
        enabled: !!sessionId,
    });

    // Mutation to Submit Answer
    const submitAnswerMutation = useMutation({
        mutationFn: async ({ questionId, choiceId }: { questionId: string; choiceId: string }) => {
            const res = await api.post<AnswerResponse>(`/exams/${sessionId}/answer`, {
                question_id: questionId,
                choice_id: choiceId,
            });
            return res.data;
        },
        onSuccess: (_, variables) => {
            // Updating local state automatically
            setLocalAnswers(prev => ({ ...prev, [variables.questionId]: variables.choiceId }));
        },
        onError: () => {
            message.error('Failed to save answer');
        },
    });

    // Mutation to Finish Exam
    const finishExamMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post<SubmissionResponse>(`/exams/${sessionId}/submit`);
            return res.data;
        },
        onSuccess: (data) => {
            setExamResult(data);
            message.success('Exam submitted successfully!');
            queryClient.invalidateQueries({ queryKey: ['exam-session', sessionId] });
        },
        onError: () => {
            message.error('Failed to submit exam');
        },
    });

    if (isLoadingQuestions || isLoadingSession) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
                <Spin size="large" description="Loading Exam..." />
            </div>
        );
    }

    if (sessionError || !sessionDetails) {
        return <Result status="500" title="Failed to load exam session." />;
    }

    if (sessionDetails.status === 'submitted' && !examResult) {
        if (!hasTimeEnded) {
            return (
                <div style={{ maxWidth: 900, margin: '0 auto', marginTop: 40 }}>
                    <Card variant="borderless">
                        <Result
                            status="success"
                            title="Exam Already Submitted"
                            subTitle="Your exam has been submitted successfully. Marks will be revealed once the exam time ends."
                            extra={[
                                <Button type="primary" key="console" onClick={() => router.push('/dashboard')}>
                                    Go to Dashboard
                                </Button>,
                            ]}
                        />
                    </Card>
                </div>
            );
        }

        if (isLoadingAnalytics || isLoadingReview) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}>
                    <Spin size="large" description="Loading Results..." />
                </div>
            );
        }

        const pct = analytics ? Number(analytics.score_pct) : 0;
        const scoreData = [
            {
                name: 'Score',
                value: pct,
                fill: pct >= 75 ? '#52c41a' : (pct >= 40 ? '#faad14' : '#f5222d'),
            }
        ];

        return (
            <div style={{ maxWidth: 900, margin: '0 auto', marginTop: 40 }}>
                <Card variant="borderless" style={{ textAlign: 'center', marginBottom: 24 }}>
                    {/* <Result
                        status="success"
                        title="Exam Results"
                        subTitle="Here is how you performed on this exam:"
                    /> */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Title level={4}>Overall Score</Title>
                        <div style={{ height: 350, width: '100%', maxWidth: 500, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart cx="50%" cy="50%" innerRadius="70%" outerRadius="100%" barSize={50} data={scoreData} startAngle={210} endAngle={-30}>
                                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                                    <RadialBar background dataKey="value" cornerRadius={25} />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Title level={1} style={{ fontSize: 64, margin: 0, color: scoreData[0].fill }}>{pct}%</Title>
                                <Text type="secondary" style={{ fontSize: 18 }}>Overall score</Text>
                            </div>
                        </div>
                    </div>
                    <Space style={{ marginTop: 24 }}>
                        <Button size="large" type="primary" onClick={() => router.push('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </Space>
                </Card>

                {reviewData && reviewData.length > 0 && (
                    <Card title="Question Review" variant="borderless">
                        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                            {reviewData.map((reviewItem: any, index: number) => {
                                const isCorrect = reviewItem.is_correct;
                                return (
                                    <Card
                                        key={reviewItem.id}
                                        size="small"
                                        title={`Question ${index + 1}`}
                                        extra={isCorrect ? <Tag color="green"><CheckCircleOutlined /> Correct</Tag> : <Tag color="red"><CloseCircleOutlined /> Incorrect</Tag>}
                                        style={{ borderColor: isCorrect ? '#b7eb8f' : '#ffa39e', backgroundColor: isCorrect ? '#f6ffed' : '#fff1f0' }}
                                    >
                                        <Title level={5}>{reviewItem.question_text}</Title>
                                        <Space orientation="vertical" style={{ width: '100%', marginTop: 16 }}>
                                            {reviewItem.options.map((opt: any) => {
                                                const isUserChoice = opt.id === reviewItem.selected_option_id;
                                                const isActualCorrect = opt.id === reviewItem.correct_option_id;
                                                let bgColor = undefined;
                                                let borderColor = undefined;

                                                if (isActualCorrect) {
                                                    bgColor = '#f6ffed';
                                                    borderColor = '#b7eb8f';
                                                } else if (isUserChoice && !isActualCorrect) {
                                                    bgColor = '#fff1f0';
                                                    borderColor = '#ffa39e';
                                                }

                                                return (
                                                    <div key={opt.id} style={{
                                                        padding: '8px 16px',
                                                        borderRadius: 8,
                                                        border: `1px solid ${borderColor || '#d9d9d9'}`,
                                                        backgroundColor: bgColor || '#fff',
                                                        display: 'flex',
                                                        alignItems: 'center'
                                                    }}>
                                                        {isActualCorrect && <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />}
                                                        {isUserChoice && !isActualCorrect && <CloseCircleOutlined style={{ color: '#f5222d', marginRight: 8 }} />}
                                                        <Text strong={isActualCorrect || isUserChoice}>{opt.text || opt.content}</Text>
                                                        {isUserChoice && <Tag style={{ marginLeft: 'auto' }}>Your Answer</Tag>}
                                                    </div>
                                                );
                                            })}
                                        </Space>
                                        {reviewItem.explanation && (
                                            <div style={{ marginTop: 16, padding: 12, backgroundColor: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                                                <Text strong>Explanation: </Text>
                                                <Text>{reviewItem.explanation}</Text>
                                            </div>
                                        )}
                                    </Card>
                                );
                            })}
                        </Space>
                    </Card>
                )}
            </div>
        );
    }

    if (!questions || questions.length === 0) {
        return <Result status="404" title="No questions found for this exam." />;
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const currentSelectedChoice = localAnswers[currentQuestion.id] || null;

    const handleNext = () => {
        if (isLastQuestion) return;
        setCurrentQuestionIndex(prev => prev + 1);
    };

    const handlePrev = () => {
        if (currentQuestionIndex === 0) return;
        setCurrentQuestionIndex(prev => prev - 1);
    }

    const handleSelectOption = (choiceId: string) => {
        setLocalAnswers(prev => ({ ...prev, [currentQuestion.id]: choiceId }));
        submitAnswerMutation.mutate({
            questionId: currentQuestion.id,
            choiceId: choiceId,
        });
    };

    if (examResult) {
        if (!hasTimeEnded) {
            return (
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                    <Card style={{ textAlign: 'center', marginBottom: 24 }}>
                        <Result
                            status="success"
                            title="Exam Submitted!"
                            subTitle="Your exam has been submitted successfully. Marks will be revealed once the exam time ends."
                        />
                        <Space style={{ marginTop: 24 }}>
                            <Button size="large" type="primary" onClick={() => router.push('/dashboard')}>
                                Return to Dashboard
                            </Button>
                        </Space>
                    </Card>
                </div>
            );
        }

        const scoreData = [
            {
                name: 'Score',
                value: Number(examResult.percentage),
                fill: Number(examResult.percentage) >= 75 ? '#52c41a' : (Number(examResult.percentage) >= 40 ? '#faad14' : '#f5222d'),
            }
        ];

        return (
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                <Card style={{ textAlign: 'center', marginBottom: 24 }}>
                    <Result
                        status="success"
                        title="Exam Completed!"
                        subTitle={`Your Score: ${examResult.score}/${examResult.total_questions} (${examResult.percentage}%)`}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Title level={4}>Overall Score</Title>
                        <div style={{ height: 350, width: '100%', maxWidth: 500, position: 'relative' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <RadialBarChart
                                    cx="50%"
                                    cy="50%"
                                    innerRadius="70%"
                                    outerRadius="100%"
                                    barSize={50}
                                    data={scoreData}
                                    startAngle={210}
                                    endAngle={-30}
                                >
                                    <PolarAngleAxis
                                        type="number"
                                        domain={[0, 100]}
                                        angleAxisId={0}
                                        tick={false}
                                    />
                                    <RadialBar
                                        background
                                        dataKey="value"
                                        cornerRadius={25}
                                    />
                                </RadialBarChart>
                            </ResponsiveContainer>
                            <div style={{ position: 'absolute', top: '55%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                                <Title level={1} style={{ fontSize: 64, margin: 0, color: scoreData[0].fill }}>{examResult.percentage}%</Title>
                                <Text type="secondary" style={{ fontSize: 18 }}>Overall score</Text>
                            </div>
                        </div>
                    </div>
                    <Space style={{ marginTop: 24 }}>
                        <Button size="large" type="primary" onClick={() => router.push('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </Space>
                </Card>
            </div>
        );
    }

    const targetTime = getUtcTime(sessionDetails.expires_at);

    return (
        <Layout style={{ minHeight: '80vh', background: 'transparent' }}>
            <Sider
                width={250}
                style={{ background: token.colorBgContainer, padding: 16, borderRadius: 8, marginRight: 16, overflowY: 'auto' }}
                breakpoint="lg"
                collapsedWidth={0}
            >
                <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <Title level={5}>Time Remaining</Title>
                    <Statistic.Timer
                        type="countdown"
                        value={targetTime}
                        onFinish={() => finishExamMutation.mutate()}
                        format="HH:mm:ss"
                        styles={{ content: { color: '#cf1322', fontWeight: 600 } }}
                    />
                </div>
                <Divider />
                <Title level={5} style={{ marginBottom: 16 }}>Question Navigator</Title>
                <Row gutter={[8, 8]}>
                    {questions.map((q, idx) => {
                        const isAnswered = !!localAnswers[q.id];
                        const isCurrent = idx === currentQuestionIndex;
                        let btnType: "default" | "primary" | "dashed" = "default";
                        if (isCurrent) {
                            btnType = "primary";
                        } else if (isAnswered) {
                            btnType = "default";
                        }

                        // We use some slight custom border coloring for answered ones to pop out.
                        return (
                            <Col span={6} key={q.id}>
                                <Button
                                    type={btnType}
                                    style={{
                                        width: '100%',
                                        padding: 0,
                                        borderColor: isAnswered && !isCurrent ? token.colorPrimary : undefined,
                                        color: isAnswered && !isCurrent ? token.colorPrimary : undefined
                                    }}
                                    onClick={() => setCurrentQuestionIndex(idx)}
                                >
                                    {idx + 1}
                                </Button>
                            </Col>
                        );
                    })}
                </Row>
                <Divider />
                <Button
                    danger
                    block
                    onClick={() => finishExamMutation.mutate()}
                    loading={finishExamMutation.isPending}
                >
                    Submit Exam Early
                </Button>
            </Sider>

            <Content style={{ background: token.colorBgContainer, padding: 24, borderRadius: 8, maxWidth: 800 }}>
                <Card variant="borderless" title={`Question ${currentQuestionIndex + 1} of ${questions.length}`}>
                    <Space orientation="vertical" size="large" style={{ width: '100%' }}>
                        <Title level={4}>{currentQuestion.content}</Title>

                        <Radio.Group
                            onChange={(e) => handleSelectOption(e.target.value)}
                            value={currentSelectedChoice}
                            style={{ width: '100%' }}
                            disabled={submitAnswerMutation.isPending}
                        >
                            <Space orientation="vertical" style={{ width: '100%' }}>
                                {currentQuestion.choices.map((choice) => {
                                    const isSelected = choice.id === currentSelectedChoice;
                                    return (
                                        <Card
                                            key={choice.id}
                                            size="small"
                                            hoverable
                                            onClick={() => !submitAnswerMutation.isPending && handleSelectOption(choice.id)}
                                            style={{
                                                borderColor: isSelected ? '#1890ff' : undefined,
                                                backgroundColor: isSelected ? '#f0faff' : undefined,
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                marginBottom: 8
                                            }}
                                        >
                                            <Space size="middle" align="start" style={{ width: '100%' }}>
                                                <Radio
                                                    value={choice.id}
                                                    checked={isSelected}
                                                    style={{ marginTop: 4 }}
                                                />
                                                <div style={{ flex: 1, paddingTop: 2 }}>
                                                    <Text style={{ fontSize: '16px', display: 'block', width: '100%' }}>
                                                        {choice.content}
                                                    </Text>
                                                </div>
                                            </Space>
                                        </Card>
                                    );
                                })}
                            </Space>
                        </Radio.Group>

                        <Row justify="space-between" style={{ marginTop: 16 }}>
                            <Col>
                                <Button onClick={handlePrev} disabled={currentQuestionIndex === 0}>
                                    Previous
                                </Button>
                            </Col>
                            <Col>
                                {!isLastQuestion ? (
                                    <Button type="primary" onClick={handleNext}>
                                        Next
                                    </Button>
                                ) : (
                                    <Button
                                        type="primary"
                                        onClick={() => finishExamMutation.mutate()}
                                        loading={finishExamMutation.isPending}
                                    >
                                        Submit Exam
                                    </Button>
                                )}
                            </Col>
                        </Row>
                    </Space>
                </Card>
            </Content>
        </Layout>
    );
}
