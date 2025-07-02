import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  Share,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import ConfettiCannon from 'react-native-confetti-cannon';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useGame } from '../context/useGame';
import ActionButton from '../components/ActionButton';
import Card from '../components/Card';
import { COLORS, SIZES } from '../constants/theme';

/**
 * End-of-game screen — everything (scorboard + buttons) scrolls together.
 */
const EndScreen = ({ navigation }) => {
  /* ────── STATE ────── */
  const { gameState, actions } = useGame();
  const {
    players = [],
    message: endScreenMessage,
    gamePhase,
    selectedPlayerForTask,
    targetScore = 20,
    blackDeck = [],
  } = gameState;

  // Siyah kart seçim state'leri
  const [isSelectingCard, setIsSelectingCard] = useState(false);
  const [selectedCardIndex, setSelectedCardIndex] = useState(null);
  const [revealedCard, setRevealedCard] = useState(null);
  const [isRevealing, setIsRevealing] = useState(false);

  /* winner / loser / sorted list */
  const { winner, loser, sortedPlayers } = useMemo(() => {
    if (!players.length) return { winner: null, loser: null, sortedPlayers: [] };

    const sorted = [...players].sort((a, b) => (b.score || 0) - (a.score || 0));
    const winnerPlayer = sorted[0];
    const explicitLoser = players.find(p => p.id === selectedPlayerForTask);
    const implicitLoser = sorted.at(-1);
    const loserPlayer =
      explicitLoser || (implicitLoser?.id !== winnerPlayer?.id ? implicitLoser : null);

    return { winner: winnerPlayer, loser: loserPlayer, sortedPlayers: sorted };
  }, [players, selectedPlayerForTask]);

  /* ────── EFFECTS ────── */
  const confettiRef = useRef(null);

  useEffect(() => {
    if (winner) {
      const t = setTimeout(() => {
        confettiRef.current?.start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 350);
      return () => clearTimeout(t);
    }
  }, [winner]);

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility?.(
      `Oyun sona erdi. Kazanan: ${winner?.name ?? 'belirlenemedi'}`,
    );
  }, [winner]);

  /* ────── ACTIONS ────── */
  const handleNewGame = useCallback(() => {
    actions.restartGame();
    navigation.replace('Setup');
  }, [actions, navigation]);

  const handleReplay = useCallback(() => {
    actions.restartWithSamePlayers();
    navigation.replace('Game');
  }, [actions, navigation]);

  const handleDrawBlackCard = useCallback(() => {
    setIsSelectingCard(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, []);

  const handleCardSelect = useCallback((cardIndex) => {
    setSelectedCardIndex(cardIndex);
    setIsRevealing(true);
    
    // Seçilen kartı blackDeck'ten al
    const selectedCard = blackDeck[cardIndex];
    
    setTimeout(() => {
      setRevealedCard(selectedCard);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      setTimeout(() => {
        actions.assignAndFinishBlackCard();
        setIsSelectingCard(false);
        setSelectedCardIndex(null);
        setRevealedCard(null);
        setIsRevealing(false);
      }, 3000); // 3 saniye kartı göster
    }, 1000); // 1 saniye bekleme
  }, [blackDeck, actions]);

  const handleShareResults = useCallback(async () => {
    try {
      let msg = 'Kart Oyunu Sonuçları\n\n';
      if (winner) msg += `🏆 Kazanan: ${winner.avatarId} ${winner.name} (${winner.score} Puan)\n`;
      msg += `🎯 Hedef Puan: ${targetScore}\n`;
      if (loser) msg += `⚫️ Siyah Kart: ${loser.avatarId} ${loser.name}\n`;
      msg += '\nSkor Tablosu:\n';
      sortedPlayers.forEach((p, i) => {
        msg += `${i + 1}. ${p.avatarId} ${p.name}: ${p.score} Puan\n`;
      });
      await Share.share({ message: msg.trim() });
    } catch (e) {
      console.error('share error', e);
    }
  }, [sortedPlayers, winner, loser, targetScore]);

  /* ────── RENDERERS ────── */
  const renderScoreRow = useCallback(
    ({ item, index }) => {
      const isWinner = item.id === winner?.id;
      const isLoser  = item.id === loser?.id;

      return (
        <MotiView
          from={{ opacity: 0, translateX: -15 }}
          animate={{ opacity: 1, translateX: 0 }}
          transition={{ type: 'timing', duration: 300, delay: 150 + index * 40 }}
          style={[
            styles.scoreRow,
            isWinner && styles.winnerRow,
            isLoser && styles.loserRow,
          ]}
        >
          <Text style={styles.rankText}>{index + 1}.</Text>
          <Text style={styles.avatarText}>{item.avatarId || '👤'}</Text>
          <Text style={styles.scoreName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.scorePoints}>{item.score ?? 0}</Text>
        </MotiView>
      );
    },
    [winner, loser],
  );

  /* ────── UI ────── */
  return (
    <LinearGradient colors={COLORS.backgroundGradient} style={styles.flexFill}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>

        {/* Confetti */}
        <ConfettiCannon
          ref={confettiRef}
          autoStart={false}
          fadeOut
          count={winner ? 240 : 0}
          origin={{ x: -10, y: 0 }}
          explosionSpeed={420}
          fallSpeed={2900}
          colors={[COLORS.accent, COLORS.positive, COLORS.warning, COLORS.white]}
        />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header & winner */}
          <MotiView
            from={{ opacity: 0, scale: 0.7, translateY: -40 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: 'spring', stiffness: 160, damping: 16 }}
            style={styles.header}
          >
            <Text style={styles.title}>Oyun Bitti!</Text>
            <View
              style={[styles.winnerContainer, !winner && styles.noWinnerContainer]}
              accessibilityLiveRegion="polite"
            >
              <Text style={[styles.winnerText, !winner && styles.noWinnerText]}>
                {winner
                  ? `🏆 Kazanan: ${winner.avatarId} ${winner.name} (${winner.score} Puan)`
                  : 'Kazanan Belirlenemedi'}
              </Text>
              <Text style={styles.targetScoreText}>🎯 Hedef Puan: {targetScore}</Text>
            </View>
          </MotiView>

          {/* Scores */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 400, delay: 250 }}
            style={styles.scoresContainer}
          >
            <Text style={styles.scoresTitle}>📊 Final Skorları</Text>
            <FlatList
              data={sortedPlayers}
              keyExtractor={item => String(item.id)}
              renderItem={renderScoreRow}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scoresList}
              scrollEnabled={false}   /* outer ScrollView handles scrolling */
            />
          </MotiView>

          {/* Black card */}
          <MotiView
            from={{ opacity: 0, translateY: 30, scale: 0.8 }}
            animate={{ 
              opacity: 1, 
              translateY: 0, 
              scale: 1,
            }}
            transition={{ 
              type: 'timing', 
              duration: 600, 
              delay: 400 
            }}
            style={styles.blackCardContainer}
          >
            <MotiView
              from={{ rotate: '0deg' }}
              animate={{ rotate: '360deg' }}
              transition={{
                type: 'timing',
                duration: 2000,
                repeat: Infinity,
                repeatReverse: false,
              }}
            >
              <Ionicons
                name="skull"
                size={SIZES.iconSizeLarge * 1.5}
                color="#FF0000"
                style={styles.blackCardIcon}
              />
            </MotiView>
            <MotiView
              from={{ opacity: 0.3 }}
              animate={{ opacity: 1 }}
              transition={{
                type: 'timing',
                duration: 1000,
                repeat: Infinity,
                repeatReverse: true,
              }}
            >
              <Text style={styles.messageText}>{endScreenMessage || ' '}</Text>
            </MotiView>
            {gamePhase === 'assigningBlackCard' && loser && !isSelectingCard && (
              <MotiView
                from={{ scale: 0.9 }}
                animate={{ scale: 1.05 }}
                transition={{
                  type: 'timing',
                  duration: 800,
                  repeat: Infinity,
                  repeatReverse: true,
                }}
              >
                <ActionButton
                  title={`${loser.name}, Kaderin Karanlık Yüzüyle Karşılaş!`}
                  onPress={handleDrawBlackCard}
                  type="danger"
                  iconLeft="skull"
                  style={styles.blackCardButton}
                />
              </MotiView>
            )}

            {/* Siyah Kart Seçim UI */}
            {isSelectingCard && (
              <MotiView
                from={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'timing', duration: 600 }}
                style={styles.cardSelectionContainer}
              >
                <Text style={styles.selectionTitle}>
                  🔮 KADERİNİ SEÇ! 🔮
                </Text>
                <Text style={styles.selectionSubtitle}>
                  Birini seç... ama seçiminin sonuçlarına hazır ol!
                </Text>
                
                <View style={styles.cardsRow}>
                  {[0, 1, 2, 3, 4].map((index) => (
                    <MotiView
                      key={index}
                      from={{ opacity: 0, translateY: 50, rotateY: '90deg' }}
                      animate={{ opacity: 1, translateY: 0, rotateY: '0deg' }}
                      transition={{ 
                        type: 'timing', 
                        duration: 800, 
                        delay: index * 200 
                      }}
                      style={styles.cardWrapper}
                    >
                      {selectedCardIndex === index && revealedCard ? (
                        <Card
                          type="siyah"
                          text={revealedCard.text}
                          isVisible={true}
                          style={styles.revealedCard}
                        />
                      ) : (
                        <Card
                          type="kapalı"
                          isVisible={true}
                          faceDownContextType="red"
                          onPress={() => !isRevealing && handleCardSelect(index)}
                          style={[
                            styles.hiddenCard,
                            selectedCardIndex === index && styles.selectedCard
                          ]}
                        />
                      )}
                    </MotiView>
                  ))}
                </View>

                {isRevealing && !revealedCard && (
                  <MotiView
                    from={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ type: 'timing', duration: 500 }}
                  >
                    <Text style={styles.revealingText}>
                      ⚡ KADERİN AÇILIYOR... ⚡
                    </Text>
                  </MotiView>
                )}

                {revealedCard && (
                  <MotiView
                    from={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: 'timing', duration: 800 }}
                    style={styles.revealedCardText}
                  >
                    <Text style={styles.fateText}>
                      💀 SENİN KADERİN! 💀
                    </Text>
                    <Text style={styles.revealedTaskText}>
                      {revealedCard.text}
                    </Text>
                  </MotiView>
                )}
              </MotiView>
            )}
          </MotiView>

          {/* Bottom actions (scrolls together) */}
          {gamePhase === 'ended' && (
            <MotiView
              from={{ opacity: 0, translateY: 30 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 500, delay: 500 }}
              style={styles.bottomActionContainer}
            >
              <ActionButton
                title="Tekrar Oyna (Aynı Kadro)"
                onPress={handleReplay}
                iconLeft="refresh-outline"
                type="primary"
                style={styles.actionButton}
              />
              <ActionButton
                title="Yeni Oyun Kur"
                onPress={handleNewGame}
                iconLeft="people-outline"
                type="secondary"
                style={styles.actionButton}
              />
              <ActionButton
                title="Sonuçları Paylaş"
                onPress={handleShareResults}
                iconLeft="share-social-outline"
                type="outline"
                style={styles.actionButton}
              />
            </MotiView>
          )}
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
};

/* ────── STYLES ────── */
const styles = StyleSheet.create({
  flexFill: { flex: 1 },
  safeArea: { flex: 1 },

  scroll:  { flex: 1 },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingBottom: SIZES.paddingLarge,
  },

  /* Header */
  header: { width: '100%', alignItems: 'center', marginBottom: SIZES.marginMedium },
  title:  {
    fontSize: SIZES.h1 * 1.2,
    fontFamily: SIZES.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.marginMedium,
  },
  winnerContainer: {
    paddingVertical: SIZES.padding * 0.8,
    paddingHorizontal: SIZES.paddingLarge,
    borderRadius: SIZES.buttonRadius * 1.5,
    borderWidth: 1.5,
    borderColor: COLORS.positiveLight,
    backgroundColor: 'rgba(72,187,120,0.3)',
  },
  noWinnerContainer: {
    backgroundColor: 'rgba(113,128,150,0.25)',
    borderColor: COLORS.textMuted,
  },
  winnerText: {
    fontSize: SIZES.title * 1.05,
    fontFamily: SIZES.bold,
    color: COLORS.white,
    textAlign: 'center',
  },
  noWinnerText: { color: COLORS.textSecondary },

  /* Scores */
  scoresContainer: {
    width: '95%',
    maxWidth: SIZES.contentMaxWidth,
    backgroundColor: COLORS.scoreboardBg,
    borderRadius: SIZES.cardRadius * 1.1,
    paddingVertical: SIZES.paddingMedium,
    paddingHorizontal: SIZES.padding,
    marginBottom: SIZES.marginLarge,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scoresTitle: {
    fontSize: SIZES.h3,
    fontFamily: SIZES.bold,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SIZES.marginMedium,
  },
  scoresList: { paddingBottom: SIZES.padding },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.padding * 0.8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  winnerRow: {
    backgroundColor: 'rgba(72,187,120,0.15)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.positive,
    paddingLeft: SIZES.paddingSmall,
  },
  loserRow: {
    backgroundColor: 'rgba(245,101,101,0.12)',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.negative,
    paddingLeft: SIZES.paddingSmall,
  },
  rankText: {
    width: 28,
    textAlign: 'right',
    marginRight: SIZES.base * 1.2,
    fontSize: SIZES.body,
    fontFamily: SIZES.bold,
    color: COLORS.textMuted,
  },
  avatarText: { fontSize: SIZES.title, marginRight: SIZES.base },
  scoreName: {
    flex: 1,
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: COLORS.textPrimary,
  },
  scorePoints: {
    minWidth: 45,
    textAlign: 'right',
    fontSize: SIZES.body * 1.05,
    fontFamily: SIZES.bold,
    color: COLORS.textPrimary,
  },

  /* Black Card */
  blackCardContainer: {
    width: '95%',
    maxWidth: SIZES.contentMaxWidth,
    alignItems: 'center',
    padding: SIZES.paddingLarge,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderRadius: SIZES.cardRadius * 1.1,
    borderWidth: 3,
    borderColor: '#FF0000',
    marginBottom: SIZES.marginLarge,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  blackCardIcon: { 
    marginBottom: 12, 
    opacity: 1,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  messageText: {
    fontSize: SIZES.body * 1.1,
    lineHeight: SIZES.body * 1.8,
    textAlign: 'center',
    color: '#FFAAAA',
    marginBottom: SIZES.marginMedium,
    fontFamily: SIZES.bold,
    textShadowColor: '#FF0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  blackCardButton: {
    marginTop: SIZES.marginSmall,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },

  /* Siyah Kart Seçim UI */
  cardSelectionContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: SIZES.marginLarge,
    padding: SIZES.paddingLarge,
    backgroundColor: 'rgba(0,0,0,0.9)',
    borderRadius: SIZES.cardRadius * 1.5,
    borderWidth: 2,
    borderColor: '#FF0000',
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
  },
  selectionTitle: {
    fontSize: SIZES.h2,
    fontFamily: SIZES.bold,
    color: '#FFD700',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#FF0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  selectionSubtitle: {
    fontSize: SIZES.body,
    color: '#FFAAAA',
    textAlign: 'center',
    marginBottom: SIZES.marginLarge,
    fontStyle: 'italic',
  },
  cardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: SIZES.marginMedium,
  },
  cardWrapper: {
    margin: SIZES.marginSmall * 0.5,
  },
  hiddenCard: {
    transform: [{ scale: 0.7 }],
  },
  selectedCard: {
    transform: [{ scale: 0.8 }],
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
  },
  revealedCard: {
    transform: [{ scale: 0.8 }],
    shadowColor: '#FF0000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  revealingText: {
    fontSize: SIZES.h3,
    fontFamily: SIZES.bold,
    color: '#FFD700',
    textAlign: 'center',
    marginTop: SIZES.marginMedium,
    textShadowColor: '#FF0000',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  revealedCardText: {
    alignItems: 'center',
    marginTop: SIZES.marginLarge,
    padding: SIZES.paddingMedium,
    backgroundColor: 'rgba(255,0,0,0.2)',
    borderRadius: SIZES.cardRadius,
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  fateText: {
    fontSize: SIZES.h2,
    fontFamily: SIZES.bold,
    color: '#FF0000',
    textAlign: 'center',
    marginBottom: SIZES.marginSmall,
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  revealedTaskText: {
    fontSize: SIZES.body * 1.1,
    fontFamily: SIZES.bold,
    color: '#FFDDDD',
    textAlign: 'center',
    lineHeight: SIZES.body * 1.6,
  },

  /* Bottom buttons */
  bottomActionContainer: {
    width: '90%',
    maxWidth: SIZES.buttonMaxWidth,
    alignItems: 'center',
    paddingTop: SIZES.margin,
    marginBottom: SIZES.marginLarge, /* so last button nefes alır */
  },
  actionButton: {
    width: '100%',
    marginBottom: SIZES.marginSmall * 1.25,
  },

  /* Target Score */
  targetScoreText: {
    fontSize: SIZES.body,
    fontFamily: SIZES.regular,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.marginSmall,
  },
});

export default EndScreen;
