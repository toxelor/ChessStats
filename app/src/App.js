import React from 'react';
import axios from 'axios';
import './App.css';
import { OAuth2AuthCodePKCE } from '@bity/oauth2-auth-code-pkce';

const lichessHost = 'https://lichess.org';
const scopes = ['email:read'];
const clientId = 'example.com';
const clientUrl = 'http://localhost:3000/'
const newsApi = 'f24598fe5d484f5ba1c668f04a7c7796'

const oauth = new OAuth2AuthCodePKCE({
  authorizationUrl: `${lichessHost}/oauth`,
  tokenUrl: `${lichessHost}/api/token`,
  clientId,
  scopes,
  redirectUrl: clientUrl,
  onAccessTokenExpiry: refreshAccessToken => refreshAccessToken(),
  onInvalidGrant: _retry => {}
});

function App() {
  const tokenReducer = (state, action) => {
    switch (action.type){
      case 'TOKEN_FETCH_INIT':
        return{
          ...state,
          isLoading: true
        }
      case 'TOKEN_FETCH_SUCCESS':
        return{
          ...state,
          isLoading: false,
          token: action.payload.token
        }
      case 'TOKEN_REMOVAL':
        return{
          ...state,
          isLoading: false,
          token: ''
        }
      default:
        throw new Error()
    }
  }

  const [token, dispatchToken] = React.useReducer(
    tokenReducer,
    { token: '', isLoading: false }
  )

  const auth = async() =>{
    dispatchToken({ type: 'TOKEN_FETCH_INIT' })
    await oauth.fetchAuthorizationCode();
    
  }

  React.useEffect(() => {
    const be = async () =>{
      oauth.isReturningFromAuthServer().then(hasAuthCode => {
        if (!hasAuthCode) { console.log("Something wrong...no auth code."); }
        else{
            return oauth.getAccessToken().then((tokenn) => {
                dispatchToken({
                  type: 'TOKEN_FETCH_SUCCESS',
                  payload: {
                    token: tokenn.token.value
                  }
                })
                console.log(tokenn.token.value)
            });
        }
        
      }).catch((potentialError) => {
        if (potentialError) { console.log(potentialError); }
      });
    }
    be()
  }, [token.token])

  const [accountInfo, setAccountInfo] = React.useState('')

  React.useEffect(() => {
    const accountFetch = async() => {
      if (token.token !== ''){
        const options = {
          headers: {
              Authorization: `Bearer ${token.token}`
          }
        }
        await axios.get('https://lichess.org/api/account', options)
        .then(async function (response) {
          setAccountInfo(response.data)
        })
        
      }
      else{
        console.log('ЗАНЯТО!!!!')
      }
      
    }
    accountFetch()
  }, [token.token])

  const logout = async() => {
    const options = {
      headers: {
          Authorization: `Bearer ${token.token}`
      }
    }
    
    await axios.delete('https://lichess.org/api/token', options)
    dispatchToken({ type: 'TOKEN_REMOVAL' })
    document.location.reload()
  }

  //;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;

  const [currentButton, setCurrentButton] = React.useState('news')

  const handleActive = (activate) => {
    const buttons = document.getElementsByClassName('slider')
    if (activate === 'news') {
      buttons[0].classList.add('selected')
      buttons[1].classList.remove('selected')
      handleStories()
    }
    else {
      buttons[1].classList.add('selected')
      buttons[0].classList.remove('selected')
    }
  }

const makeActive = (activate) => {
  setCurrentButton(activate)
  handleActive(activate)
}

React.useEffect(() => {
  handleActive(currentButton)
}, [currentButton])

const storiesReducer = (state, action) => {
  switch(action.type){
    case 'STORIES_INIT':
      return {
      ...state,
      isLoading: true
    }
    case 'STORIES_SUCCESS':
      return {
      ...state,
      isLoading: false,
      stories: action.payload.stories
    }
    default: throw new Error()
  }
}

const [stories, dispatchStories] = React.useReducer(
  storiesReducer,
  { stories: '', isLoading: false }
)

const handleStories = async () => {
  dispatchStories({ type: 'STORIES_INIT' })
  const res = await axios.get(`https://newsapi.org/v2/everything?q=chess&pageSize=10&sortBy=popularity&language=ru&apiKey=${newsApi}`)
  console.log(res.data)
  dispatchStories({
    type: 'STORIES_SUCCESS',
    payload: {
      stories: res.data
    }
    
  })

}

  return (
    <div className='App'>
      <div className='nav-bar'>
      {accountInfo === '' 
      ? (<button className='button' onClick={auth}>
            {token.isLoading ? ('Загрузка...'): ('Войти')}
        </button>) 
      : (
        <a href={accountInfo.url} target='_blank' rel="noreferrer" style={{textDecoration: 'none'}}>
          <p className='text'>{accountInfo.username}</p>
        </a>
      
      )}
        
        {
          accountInfo === ''
          ? (<span></span>)
          : (<button className='button' onClick={logout}>
              Выйти
          </button>)
        }
      </div>
      <div className='navigation'>
        <button className='slider' onClick={() => makeActive('news')}>
          Новости
        </button>

        <button className='slider' onClick={() => makeActive('account')}>
          Аккаунт
        </button>
      </div>
      {
        currentButton === 'news'
        ? (<><p>новости)</p></>)
        : (
          accountInfo === ''
          ? (<div style={{width: '96%', height: '80vh', padding: '20px 30px', paddingRight:'60px'}}>
          <div style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', flexDirection: 'column', background: 'rgba(128, 128, 128, 0.115)'}}>
          <p className='text' style={{textAlign: 'center'}}>Чтобы увидеть информацию об аккаунте, войдите в него</p>
        </div>
        </div>)
          : (
            <Account accountInfo={accountInfo} token={token} />
          )
        )

        
      }
    </div>
    
  );

  
}

const Account = ({accountInfo, token}) => {
  const [games, setGames] = React.useState({})

  const [isLoading, setIsLoading] = React.useState(false)

  const [isError, setIsError] = React.useState(false)

  

  const handleGames = type => {
    setIsLoading(true)
    setIsError(false)
    handleActive(type)
    fetchGames(type)
  }

  const handleActive = type => {
    const types = ['blitz', 'bullet', 'correspondence', 'classical', 'rapid']
    const current = types.indexOf(type)
    const buttons = document.getElementsByClassName('game-modes')
    for (let i = 0; i < 5; i++){
      if (types[current] === types[i]){
        buttons[i].style.background = 'rgba(128, 128, 128, 0.115)'
      }
      else {
        buttons[i].style.background = 'transparent'
      }
    }
  }

  const fetchGames = async (type, until = 9999999999999) => {
    let govn = {}
    let i = 0;
    const readStream = processLine => response => {
      const stream = response.body.getReader();
      const matcher = /\r?\n/;
      const decoder = new TextDecoder();
      let buf = '';

    
      const loop = () =>
        stream.read().then(({ done, value }) => {
          if (done) {
            if (buf.length > 0) processLine(JSON.parse(buf));
          } else {
            const chunk = decoder.decode(value, {
              stream: true
            });
            buf += chunk;
    
            const parts = buf.split(matcher);
            buf = parts.pop();
            for (const i of parts.filter(p => p)) processLine(JSON.parse(i));
            return loop();
          }
        });
        
      return loop();
    }
    
    const onMessage = obj => {
      govn[i] = obj
      i++
    }
    const onComplete = () => {
      setIsLoading(false)
      setGames(govn)
    }
    const onError = () => {
      setIsLoading(false)
      console.log('ашипка')
      setIsError(true)
    }
    const stream = fetch(`https://lichess.org/api/games/user/${accountInfo.username}?max=10&perfType=${type}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.token}`,
        Accept:'application/x-ndjson'
      }
    })
    stream
      .then(readStream(onMessage))
      .then(onComplete)
      .catch(onError)
    
  }
  return (
  <div className='container'>
            <div className='left-bar'>
              <span className='text'>
                Игр: {<span style={{color: 'green'}}>{accountInfo.count.win}</span>}/
                {<span style={{color: 'red'}}>{accountInfo.count.loss}</span>}/
                {<span style={{color: 'gray'}}>{accountInfo.count.draw}</span>}
                <p style={{margin: '0'}} className='small-text'>
                  Процент побед: {(accountInfo.count.win / accountInfo.count.all).toFixed(3)}%
                </p> 
              </span>
              {Object.keys(accountInfo.perfs).map(key => {
                          const name = key
                          const num = accountInfo.perfs[key].games
                          const rating = accountInfo.perfs[key].rating
                          const progress = accountInfo.perfs[key].prog >= 0 ? 'green' : 'red'
                          return(
                              <div key={key} className='game-modes' onClick={() => handleGames(name)}>
                                  <span style={{display: 'flex'}} className='game-text text'>
                                      <span>{name}
                                        <p className='small-text'>
                                          Всего игр: {num}, рейтинг: <span style={{color: progress}}>{rating}</span>
                                        </p>
                                      </span>  
                                  </span>
                              </div>
                      )
                    })}
            </div>
            <div className='info-block'>
              {
                console.log('games', games)
              }
              {
                
                (
                  isLoading
                  ? (
                    <div style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center'}}>
                      <p className='text' style={{textAlign: 'center'}}>Загрузка...</p>
                    </div>
                  )
                  : (
                    isError
                    ? (
                      <div style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center', flexDirection: 'column'}}>
                        <p className='text' style={{textAlign: 'center'}}>Кажется произошла ошибка :-( </p>
                        <p className='text' style={{textAlign: 'center'}}>Выберите другой режим игры или попробуйте через минуту </p>
                      </div>
                    )
                    : Object.keys(games).length === 0
                    ? (<div style={{display: 'flex', alignItems: 'center', width: '100%', height: '100%', justifyContent: 'center'}}>
                        <p className='text' style={{textAlign: 'center'}}>Выбери режим игры в котором сыграно больше одной игры, чтобы отобразить результаты последних десяти игр</p>
                    </div>)
                    :
                      (Object.keys(games).map(game => {
                      const white = games[game].players.white.user ? games[game].players.white.user.name : 'нет имени'
                      const black = games[game].players.black.user ? games[game].players.black.user.name : 'нет имени'
                      const user = white === accountInfo.username ? white : black
                      const userColor = user === white ? 'white' : 'black'
                      const notUser = white === accountInfo.username ? black : white
                      const notUserColor = notUser === black ? 'black' : 'white'
                      const winnerColor = games[game].winner === 'black' ? 'black' : 'white'
                      const win = games[game].players[games[game].winner] 
                      ? games[game].players[games[game].winner].user !== undefined
                        ? games[game].players[games[game].winner].user.name 
                        : 'нет имени'
                        : 'чзх'
                      const winner = games[game].status === 'draw' ? 'Ничья' : 'Победа за '
                      return (
                        <a className='info-elem text' key={game.fullId} target='_blank' rel="noreferrer" href={`https://lichess.org/${games[game].fullId}`}>
                            <span style={{width: '55%'}} className='text'>
                              <span style={{color: `${userColor}`}}>{user}</span> vs <span style={{color: `${notUserColor}`}}>{notUser}</span>
                            </span> 
                            <span style={{width: '45%'}} className='text'>
                              {winner} {games[game].status === 'draw' ? '' : <span style={{color: `${winnerColor}`}}>{` ${win}`}</span>}
                            </span>
                        </a>
                      )
                    }))
                  )
                  
              )
              }
              
            </div>
          </div>
  )
}




export default App;
