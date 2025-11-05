import React, { useState, useEffect } from 'react';

const YoutubeConverter = () => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // 반응형 처리
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 유튜브 URL에서 비디오 ID 추출
  const extractVideoId = (url) => {
    if (!url || typeof url !== 'string') return null;

    // 이미 iframe 형식인 경우
    const iframeMatch = url.match(/src=["']([^"']+)["']/);
    if (iframeMatch) {
      const src = iframeMatch[1];
      const embedMatch = src.match(/youtube\.com\/embed\/([^?&]+)/);
      if (embedMatch) return embedMatch[1];
    }

    // 다양한 유튜브 URL 형식 처리
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^?&\/\s]+)/,
      /youtube\.com\/watch\?.*?v=([^&\/\s]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  };

  // HTML에서 유튜브 링크를 iframe으로 변환
  const convertToIframe = (text) => {
    if (!text) return '';

    // 비디오 ID만 입력된 경우
    if (/^[a-zA-Z0-9_-]{11}$/.test(text.trim())) {
      return generateIframe(text.trim());
    }

    // URL 또는 iframe 태그가 포함된 경우
    const videoId = extractVideoId(text);
    if (videoId) {
      return generateIframe(videoId);
    }

    // HTML 내용 전체에서 유튜브 링크 찾기
    const urlPattern = /(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/gi;
    const iframePattern = /<iframe[^>]*src=["']([^"']+)["'][^>]*>/gi;
    
    let convertedText = text;

    // iframe 태그를 찾아서 변환
    convertedText = convertedText.replace(iframePattern, (match, src) => {
      const id = extractVideoId(src);
      if (id) {
        return generateIframe(id);
      }
      return match;
    });

    // URL 패턴을 찾아서 변환
    convertedText = convertedText.replace(urlPattern, (match) => {
      const id = extractVideoId(match);
      if (id) {
        return generateIframe(id);
      }
      return match;
    });

    return convertedText;
  };

  // iframe HTML 생성
  const generateIframe = (videoId) => {
    return `<iframe width="780" height="439" src="https://www.youtube.com/embed/${videoId}?mute=1&controls=1" frameborder="0" allowfullscreen></iframe>`;
  };

  const handleConvert = async () => {
    setError('');
    setCopied(false);
    if (!input.trim()) {
      setError('유튜브 링크를 입력해주세요.');
      return;
    }

    setIsConverting(true);
    
    // 변환 애니메이션을 위한 약간의 딜레이
    await new Promise(resolve => setTimeout(resolve, 300));

    const converted = convertToIframe(input);
    if (!converted || !converted.includes('<iframe')) {
      setError('유튜브 링크를 찾을 수 없습니다. 올바른 형식의 링크를 입력해주세요.');
      setIsConverting(false);
      return;
    }

    setOutput(converted);
    setIsConverting(false);

    // 자동 복사
    try {
      await navigator.clipboard.writeText(converted);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('복사 실패:', err);
    }
  };

  const handleCopy = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      alert('복사에 실패했습니다.');
    }
  };

  // Enter 키로 변환
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (input.trim()) {
          handleConvert();
        }
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input]);

  const handleClear = () => {
    setInput('');
    setOutput('');
    setError('');
  };

  const exampleLinks = [
    'https://www.youtube.com/watch?v=crFxVE_yfN4',
    'https://youtu.be/crFxVE_yfN4',
    'https://www.youtube.com/embed/crFxVE_yfN4',
    'crFxVE_yfN4',
    '<iframe src="https://www.youtube.com/embed/crFxVE_yfN4"></iframe>',
  ];

  const handleExampleClick = (example) => {
    setInput(example);
    setOutput('');
    setError('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #4facfe 75%, #00f2fe 100%)',
      backgroundSize: '400% 400%',
      animation: 'gradient 15s ease infinite',
      padding: '20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }
        .card {
          animation: slideIn 0.6s ease-out;
          backdropFilter: blur(10px);
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)';
        }
        .button-glow {
          boxShadow: '0 0 20px rgba(0, 112, 243, 0.5)';
        }
        .button-glow:hover {
          boxShadow: '0 0 30px rgba(0, 112, 243, 0.8)';
          animation: pulse 0.5s ease-in-out;
        }
        .success-animation {
          animation: bounce 0.6s ease-in-out;
        }
      `}</style>

      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <div style={{
          textAlign: 'center',
          marginBottom: '50px',
          animation: 'slideIn 0.8s ease-out'
        }}>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: '800',
            marginBottom: '15px',
            color: '#fff',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-0.5px'
          }}>
            🎬 쿠팡 상세페이지 유튜브 링크 컨버터
          </h1>
          
          <p style={{
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '10px',
            fontSize: 'clamp(14px, 2vw, 18px)',
            textShadow: '1px 1px 4px rgba(0,0,0,0.2)'
          }}>
            어떤 형식의 유튜브 링크든 쿠팡 상세페이지용 iframe 형식으로 자동 변환
          </p>
          <p style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            marginTop: '5px'
          }}>
            💡 Ctrl/Cmd + Enter로 빠르게 변환
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
          gap: '30px',
          marginBottom: '30px'
        }}>
          {/* 입력 영역 */}
          <div className="card" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            border: '1px solid rgba(255, 255, 255, 0.18)'
          }}>
            <label style={{
              display: 'flex',
              fontSize: '20px',
              fontWeight: '700',
              marginBottom: '20px',
              color: '#333',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontSize: '24px'
              }}>📥</span>
              입력 (유튜브 링크 또는 HTML)
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="유튜브 링크를 입력하거나 붙여넣으세요...&#10;&#10;예시:&#10;https://www.youtube.com/watch?v=crFxVE_yfN4&#10;또는&#10;crFxVE_yfN4"
              style={{
                width: '100%',
                minHeight: '350px',
                padding: '20px',
                fontSize: '15px',
                border: '3px solid #e0e0e0',
                borderRadius: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* 출력 영역 */}
          <div className="card" style={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            padding: '30px',
            borderRadius: '20px',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <label style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#333',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <span style={{
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  fontSize: '24px'
                }}>📤</span>
                출력 (쿠팡용 iframe)
              </label>
              {output && (
                <button
                  onClick={handleCopy}
                  className={copied ? 'success-animation' : ''}
                  style={{
                    padding: '10px 20px',
                    background: copied 
                      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease',
                    boxShadow: copied ? '0 4px 15px rgba(17, 153, 142, 0.4)' : '0 4px 15px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    if (!copied) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!copied) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                    }
                  }}
                >
                  {copied ? '✅ 복사 완료!' : '📋 복사'}
                </button>
              )}
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="변환된 iframe 코드가 여기에 표시됩니다...&#10;변환 후 자동으로 클립보드에 복사됩니다!"
              style={{
                width: '100%',
                minHeight: '350px',
                padding: '20px',
                fontSize: '15px',
                border: '3px solid #e0e0e0',
                borderRadius: '12px',
                fontFamily: 'monospace',
                resize: 'vertical',
                background: output 
                  ? 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
                  : '#f9f9f9',
                boxSizing: 'border-box',
                transition: 'all 0.3s ease',
                outline: 'none',
                cursor: 'text'
              }}
              onClick={() => {
                if (output) {
                  const textarea = document.querySelector('textarea[readonly]');
                  textarea.select();
                }
              }}
            />
            {copied && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'rgba(17, 153, 142, 0.95)',
                color: 'white',
                padding: '15px 30px',
                borderRadius: '15px',
                fontSize: '18px',
                fontWeight: '600',
                boxShadow: '0 8px 32px rgba(17, 153, 142, 0.4)',
                zIndex: 10,
                animation: 'bounce 0.6s ease-in-out'
              }}>
                ✅ 클립보드에 복사되었습니다!
              </div>
            )}
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div style={{
            padding: '20px',
            background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)',
            borderRadius: '15px',
            color: '#fff',
            marginBottom: '30px',
            textAlign: 'center',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 4px 15px rgba(238, 90, 111, 0.3)',
            animation: 'slideIn 0.5s ease-out'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* 버튼 영역 */}
        <div style={{
          display: 'flex',
          gap: '20px',
          justifyContent: 'center',
          marginBottom: '50px',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={handleConvert}
            disabled={isConverting}
            className="button-glow"
            style={{
              padding: '18px 50px',
              background: isConverting 
                ? 'linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: isConverting ? 'not-allowed' : 'pointer',
              fontSize: '18px',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseOver={(e) => {
              if (!isConverting) {
                e.target.style.transform = 'translateY(-3px) scale(1.02)';
                e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseOut={(e) => {
              if (!isConverting) {
                e.target.style.transform = 'translateY(0) scale(1)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }
            }}
          >
            {isConverting ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</span>
                {' '}변환 중...
              </>
            ) : (
              <>
                <span style={{ fontSize: '20px' }}>🔄</span>
                {' '}변환하기 (자동 복사)
              </>
            )}
          </button>
          <button
            onClick={handleClear}
            style={{
              padding: '18px 50px',
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '15px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: '700',
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(245, 87, 108, 0.4)'
            }}
            onMouseOver={(e) => {
              e.target.style.transform = 'translateY(-3px) scale(1.02)';
              e.target.style.boxShadow = '0 12px 35px rgba(245, 87, 108, 0.6)';
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0) scale(1)';
              e.target.style.boxShadow = '0 8px 25px rgba(245, 87, 108, 0.4)';
            }}
          >
            <span style={{ fontSize: '20px' }}>🗑️</span>
            {' '}초기화
          </button>
        </div>

        {/* 예제 링크 */}
        <div className="card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          marginBottom: '30px'
        }}>
          <h3 style={{
            fontSize: '22px',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '26px'
            }}>💡</span>
            예제 링크 (클릭하여 사용)
          </h3>
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '15px'
          }}>
            {exampleLinks.map((link, index) => (
              <button
                key={index}
                onClick={() => handleExampleClick(link)}
                style={{
                  padding: '12px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '300px',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.3)'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px) scale(1.05)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.5)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0) scale(1)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.3)';
                }}
                title={link}
              >
                {link.length > 40 ? link.substring(0, 40) + '...' : link}
              </button>
            ))}
          </div>
        </div>

        {/* 사용 방법 */}
        <div className="card" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '30px',
          borderRadius: '20px',
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          border: '1px solid rgba(255, 255, 255, 0.18)'
        }}>
          <h3 style={{
            fontSize: '22px',
            fontWeight: '700',
            marginBottom: '20px',
            color: '#333',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '26px'
            }}>📖</span>
            사용 방법
          </h3>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            lineHeight: '2'
          }}>
            <li style={{ 
              marginBottom: '15px', 
              paddingLeft: '35px', 
              position: 'relative',
              fontSize: '16px',
              color: '#555'
            }}>
              <span style={{ 
                position: 'absolute', 
                left: 0,
                fontSize: '24px'
              }}>1️⃣</span>
              유튜브 링크를 입력란에 붙여넣거나 입력하세요
            </li>
            <li style={{ 
              marginBottom: '15px', 
              paddingLeft: '35px', 
              position: 'relative',
              fontSize: '16px',
              color: '#555'
            }}>
              <span style={{ 
                position: 'absolute', 
                left: 0,
                fontSize: '24px'
              }}>2️⃣</span>
              "변환하기" 버튼을 클릭하거나 <strong style={{color: '#667eea'}}>Ctrl/Cmd + Enter</strong>를 누르세요
            </li>
            <li style={{ 
              marginBottom: '15px', 
              paddingLeft: '35px', 
              position: 'relative',
              fontSize: '16px',
              color: '#555'
            }}>
              <span style={{ 
                position: 'absolute', 
                left: 0,
                fontSize: '24px'
              }}>3️⃣</span>
              <strong style={{color: '#11998e'}}>자동으로 클립보드에 복사</strong>되므로 바로 쿠팡 상세페이지에 붙여넣으세요!
            </li>
          </ul>
          <div style={{
            marginTop: '25px',
            padding: '20px',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: '15px',
            border: '2px solid rgba(102, 126, 234, 0.2)'
          }}>
            <strong style={{ 
              color: '#667eea',
              fontSize: '18px',
              display: 'block',
              marginBottom: '15px'
            }}>
              ✨ 지원하는 링크 형식:
            </strong>
            <ul style={{ 
              margin: '0',
              paddingLeft: '25px',
              lineHeight: '2.2',
              color: '#555',
              fontSize: '15px'
            }}>
              <li>https://www.youtube.com/watch?v=VIDEO_ID</li>
              <li>https://youtu.be/VIDEO_ID</li>
              <li>https://www.youtube.com/embed/VIDEO_ID</li>
              <li>비디오 ID만 (예: crFxVE_yfN4)</li>
              <li>기존 iframe 태그</li>
              <li>HTML 내용에 포함된 유튜브 링크</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default YoutubeConverter;

