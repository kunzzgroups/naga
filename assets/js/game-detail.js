(function(){
  const gameImg='assets/images/game.png';

  const gameKeys={
    slot:['game_xmas','game_rave_jump','game_god_of_war','game_detective_dee2','game_gu_gu_gu','game_rave_jump_2','game_lucky_3','game_flyout','game_wild_fudge','game_good_fortune','game_pig_of_luck','game_skr_skr','game_bonus_bear','game_golden_tiger','game_lucky_wheel'],
    vpslot:['game_dragon_vps','game_neon_spin','game_viking_gold','game_samurai_win','game_ocean_king','game_mega_gems','game_treasure_box','game_fortune_cat','game_wild_star','game_magic_lamp','game_royal_spin','game_super_ace'],
    fish:['game_fishing_king','game_ocean_party','game_dragon_fishing','game_golden_shark','game_mega_catch','game_pirate_fish','game_sea_hunter','game_fish_hunter','game_lucky_whale','game_deep_bonus','game_cannon_war','game_aqua_gold'],
    arcade:['game_crash_war','game_lucky_dice','game_fruit_blast','game_speed_racer','game_boxing_king','game_rocket_win','game_candy_rush','game_treasure_hunt','game_dragon_ball','game_mega_jump','game_ninja_run','game_golden_goal'],
    table:['game_baccarat','game_roulette','game_blackjack','game_sic_bo','game_dragon_tiger','game_poker_king','game_bull_bull','game_casino_holdem','game_fan_tan','game_teen_patti','game_andar_bahar','game_pai_gow']
  };

  const fallbackNames={
    game_xmas:'Xmas',
    game_rave_jump:'Rave Jump',
    game_god_of_war:'God Of War',
    game_detective_dee2:'Detective Dee2',
    game_gu_gu_gu:'Gu Gu Gu',
    game_rave_jump_2:'Rave Jump 2',
    game_lucky_3:'Lucky 3',
    game_flyout:'Flyout',
    game_wild_fudge:'Wild Fudge',
    game_good_fortune:'Good Fortune',
    game_pig_of_luck:'Pig Of Luck',
    game_skr_skr:'Skr Skr',
    game_bonus_bear:'Bonus Bear',
    game_golden_tiger:'Golden Tiger',
    game_lucky_wheel:'Lucky Wheel',
    game_dragon_vps:'Dragon VPS',
    game_neon_spin:'Neon Spin',
    game_viking_gold:'Viking Gold',
    game_samurai_win:'Samurai Win',
    game_ocean_king:'Ocean King',
    game_mega_gems:'Mega Gems',
    game_treasure_box:'Treasure Box',
    game_fortune_cat:'Fortune Cat',
    game_wild_star:'Wild Star',
    game_magic_lamp:'Magic Lamp',
    game_royal_spin:'Royal Spin',
    game_super_ace:'Super Ace',
    game_fishing_king:'Fishing King',
    game_ocean_party:'Ocean Party',
    game_dragon_fishing:'Dragon Fishing',
    game_golden_shark:'Golden Shark',
    game_mega_catch:'Mega Catch',
    game_pirate_fish:'Pirate Fish',
    game_sea_hunter:'Sea Hunter',
    game_fish_hunter:'Fish Hunter',
    game_lucky_whale:'Lucky Whale',
    game_deep_bonus:'Deep Bonus',
    game_cannon_war:'Cannon War',
    game_aqua_gold:'Aqua Gold',
    game_crash_war:'Crash War',
    game_lucky_dice:'Lucky Dice',
    game_fruit_blast:'Fruit Blast',
    game_speed_racer:'Speed Racer',
    game_boxing_king:'Boxing King',
    game_rocket_win:'Rocket Win',
    game_candy_rush:'Candy Rush',
    game_treasure_hunt:'Treasure Hunt',
    game_dragon_ball:'Dragon Ball',
    game_mega_jump:'Mega Jump',
    game_ninja_run:'Ninja Run',
    game_golden_goal:'Golden Goal',
    game_baccarat:'Baccarat',
    game_roulette:'Roulette',
    game_blackjack:'Blackjack',
    game_sic_bo:'Sic Bo',
    game_dragon_tiger:'Dragon Tiger',
    game_poker_king:'Poker King',
    game_bull_bull:'Bull Bull',
    game_casino_holdem:'Casino Holdem',
    game_fan_tan:'Fan Tan',
    game_teen_patti:'Teen Patti',
    game_andar_bahar:'Andar Bahar',
    game_pai_gow:'Pai Gow'
  };

  const grid=document.getElementById('detailGameGrid');
  let currentType='slot';

  function translate(key){
    if(window.I18N && typeof window.I18N.t === 'function'){
      const value=window.I18N.t(key);
      if(value && value !== key) return value;
    }
    return fallbackNames[key] || key;
  }

  function render(type){
    if(!grid) return;
    currentType=type || currentType;
    grid.innerHTML='';
    (gameKeys[currentType]||gameKeys.slot).forEach((key, index)=>{
      const name=translate(key);
      const item=document.createElement('article');
      item.className='detail-game-card provider-launch-card';
      item.setAttribute('role', 'button');
      item.setAttribute('tabindex', '0');
      item.dataset.gameCode = key;
      item.innerHTML=`
        <div class="detail-game-img-wrap">
          <img class="provider-launch-img" src="${gameImg}" alt="${name}" data-i18n-alt="${key}" data-game-code="${key}">
          ${index===0?'<span class="new-ribbon" data-i18n="new">'+translate('new')+'</span>':''}
        </div>
        <button type="button" class="detail-play-btn provider-launch-btn" data-game-code="${key}" data-i18n="play">${translate('play')}</button>
      `;
      grid.appendChild(item);

      if(window.NAGA_PROVIDER_LAUNCH && typeof window.NAGA_PROVIDER_LAUNCH.bindElement === 'function'){
        window.NAGA_PROVIDER_LAUNCH.bindElement(item, { gameCode: key }, { transferAmount: 0 });
        const img = item.querySelector('.provider-launch-img');
        const btn = item.querySelector('.provider-launch-btn');
        window.NAGA_PROVIDER_LAUNCH.bindElement(img, { gameCode: key }, { transferAmount: 0 });
        window.NAGA_PROVIDER_LAUNCH.bindButton(btn, { gameCode: key }, { transferAmount: 0 });
      }
    });
  }

  document.querySelectorAll('.game-type-tab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.querySelectorAll('.game-type-tab').forEach(x=>x.classList.remove('active'));
      btn.classList.add('active');
      render(btn.dataset.type);
    });
  });

  document.addEventListener('i18n:changed', function(){
    render(currentType);
  });

  render(currentType);
})();
