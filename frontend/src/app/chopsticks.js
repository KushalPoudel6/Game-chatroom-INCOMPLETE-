import { useEffect, useState } from "react";


export function Chopsticks({ clientRef, chopsticks, players }) {
	
    const { game_info, turn, event, winner } = chopsticks;
	const myIndex = clientRef.current.playerIndex;
	const isMyTurn = turn === myIndex;
	console.log("My index:", myIndex)

    const [action, setAction] 							= useState(null); // "hit" or "transfer"
	const [selectedSourceHand, setSelectedSourceHand] 	= useState(null) //0 (left) or 1 (right)
	const [transferAmount, setTransferAmount] 			= useState(1);
	const [transferDirection, setTransferDirection] 	= useState("L->R");

    function sendMove(move) {
    	const payload = { type: "chopsticks_move", turn, move };
    	console.log("📤 [Chopsticks] sending:", payload);
    	clientRef.current.socket.send(JSON.stringify(payload));
    	// reset UI state
    	setAction(null);
    	setSelectedSourceHand(null);
  	}
    return (
        <div>
            <h2> Chopsticks </h2>

            {event === "game_over" && (
				<h3 style={{ color: "green" }}>🎉 Game Over! Winner: {winner} 🎉 </h3>
			)}
			{event === "redo_turn" && (
				<p style={{ color: "red" }}>⛔ Invalid move, moron. ⛔</p>
			)}
			{event === "valid" && isMyTurn && (
				<p style={{ color: "blue" }}>✅ Your turn! ✅ </p>
			)}

            {/* Player hands */}
            
			{game_info.map((p, idx) => (
				<div
					key={idx}
					className={`player-hand ${idx === turn ? "current-turn" : ""}`}
				>
					<strong>{players[idx] ?? `Player ${idx}`}</strong>
					<div>Left: {p.left} | Right: {p.right}</div>
					<div>Status: {p.eliminated ? "💀" : "😊"}</div>
				</div>
			))}
			{/*if its your game and not over, give options */}
            {isMyTurn && event !== "game_over" && action == null &&(
                <div> 
					<h4>Pick a move:</h4>
					<button onClick={() => setAction("hit")}>Hit</button>
					<button
  						onClick={() => {
    						setAction("transfer");
    						setSelectedSourceHand(null);
  						}}
  						style={{ marginLeft: "0.5rem" }}
					>
  						Transfer
					</button>
                </div>
            )}
			{/* ─ Hit UI: Step 1 = choose your hand ────────────────────────────── */}
      		{action === "hit" && selectedSourceHand === null && (
      			<div style={{ marginTop: 16 }}>
      				<h4>Choose your hand to hit with:</h4>
      		    	<button onClick={() => setSelectedSourceHand(0)}>Left</button>
      		    	<button
      		      	onClick={() => setSelectedSourceHand(1)}
      		      	style={{ marginLeft: 8 }}>
      		      	Right
      		    	</button>
      		  </div>
      		)}

			{/*Choosing opponent hands*/}
      		{action === "hit" && selectedSourceHand !== null && (
        	<div style={{ marginTop: 16 }}>
        		<h4>Pick a target hand:</h4>

        		{players.map((name, idx) => {
        	    const p = game_info[idx];
        	    // Skip self and eliminated players
        	    if (idx === myIndex || p.eliminated) return null;

        	    return (
        	      <div key={idx} style={{ marginBottom: 8 }}>
        	        <button
        	          onClick={() =>
        	            sendMove({
        	              type:        "hit",
        	              source_hand: selectedSourceHand,
        	              target:      idx,
        	              target_hand: 0,
        	            })
        	          }
        	        >
        	          {name}’s Left
        	        </button>
        	        <button
        	          onClick={() =>
        	            sendMove({
        	              type:        "hit",
        	              source_hand: selectedSourceHand,
        	              target:      idx,
        	              target_hand: 1,
        	            })
        	          }
        	          style={{ marginLeft: 8 }}
        	        >
        	          {name}’s Right
        	        </button>
        	      </div>
        	    );
        	  })}
        	</div>
        )}	

		{/* Transfer UI */}
			{action === "transfer" && (
				<div style={{ marginTop: "1rem" }}>
					<h4>Transfer: Choose amount (1-4)</h4>
						<input
							type="number"
							value={transferAmount}
						onChange={(e) => setTransferAmount(parseInt(e.target.value))}
						min={1}
						max={4}
					/>

					<h4>Choose direction</h4>
					<select value={transferDirection} onChange={(e) => setTransferDirection(e.target.value)}>
						<option value="L->R">Left → Right</option>
						<option value="R->L">Right → Left</option>
					</select>

					<div style={{ marginTop: "1rem" }}>
						<button
							onClick={() =>
								sendMove({
									type: "transfer",
									amount: transferAmount,
									direction: transferDirection,
								})
							}
						>
							✅ Confirm Transfer
						</button>
					</div>
				</div>
			)}
		</div>
	)

}